/**
 * dashboardData — Data layer del dashboard de mantenimiento.
 * ----------------------------------------------------------
 * Agrupa todo lo relacionado a carga + transformación de datos
 * desde Supabase:
 *   - Constantes (circuit breaker, auto-refresh, meses ES)
 *   - Carga desde PostgREST con circuit breaker
 *   - Normalización snake_case → "Sheet-like"
 *   - Parser de fechas + períodos
 *
 * Migrado de Google Sheets/Apps Script a PostgREST. La fuente es
 * Supabase directamente (sin URL configurable ni CSV).
 */

import { supabase } from "../services/supabase";

// === Constantes ===

/** Circuit breaker: tras N errores consecutivos, pausa auto-refresh. */
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_RESET_MS = 60_000;

/** Auto-refresh cada 2 minutos (ms). */
export const AUTO_REFRESH_INTERVAL_MS = 120_000;

/** Meses en español para formateo de períodos. */
const MONTHS_ES = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
];

// === Estado module-scope (no React) — circuit breaker + load guard ===

let isLoading = false;
let currentLoadGen = 0;
let consecutiveErrors = 0;
let circuitOpenedAt = 0;

/** Circuit breaker abierto? */
function isCircuitOpen() {
    if (circuitOpenedAt === 0) return false;
    const elapsed = Date.now() - circuitOpenedAt;
    if (elapsed > CIRCUIT_BREAKER_RESET_MS) {
        circuitOpenedAt = 0;
        consecutiveErrors = 0;
        return false;
    }
    return true;
}

function recordLoadSuccess() {
    consecutiveErrors = 0;
    circuitOpenedAt = 0;
}

function recordLoadError() {
    consecutiveErrors++;
    if (consecutiveErrors >= CIRCUIT_BREAKER_THRESHOLD) {
        circuitOpenedAt = Date.now();
    }
}

export function getCircuitState() {
    return {
        consecutiveErrors,
        circuitOpenedAt,
        isOpen: isCircuitOpen(),
    };
}

/**
 * Carga inicial de datos desde Supabase.
 * force=true cancela la carga en curso y arranca una nueva.
 * Retorna { data, metadata, source, error?, skipped? }
 *
 * source ∈ { "live", "fallback" }. "fallback" se devuelve si Supabase
 * no responde o tira error — array vacío.
 */
export async function loadData({ force = false } = {}) {
    if (isLoading && !force) {
        return { data: null, skipped: true };
    }
    if (!force && isCircuitOpen()) {
        return { data: null, error: "Circuit breaker abierto" };
    }
    if (!supabase) {
        return { data: [], metadata: null, source: "fallback" };
    }

    const myGen = ++currentLoadGen;
    isLoading = true;

    try {
        // Dos queries en paralelo (OTS + Informes Terreno).
        const [otsRes, infoRes] = await Promise.all([
            supabase
                .from("mantenimiento_ots")
                .select("*")
                .order("fecha_servicio", { ascending: false })
                .limit(5000),
            supabase
                .from("mantenimiento_informes_terreno")
                .select("*")
                .order("fecha_servicio", { ascending: false })
                .limit(5000),
        ]);

        if (myGen !== currentLoadGen) return { data: null, skipped: true };

        if (otsRes.error || infoRes.error) {
            const msg =
                otsRes.error?.message ??
                infoRes.error?.message ??
                "Error desconocido";
            recordLoadError();
            return { data: null, error: msg };
        }

        // Combina y normaliza al shape "Sheet-like"
        const ots = (otsRes.data ?? []).map((r) => ({
            ...r,
            fuente: r.fuente ?? "OT Taller",
        }));
        const informes = (infoRes.data ?? []).map((r) => ({
            ...r,
            fuente: r.fuente ?? "Informe Terreno",
        }));

        const combined = [...ots, ...informes];
        const normalized = normalizarFilas(combined);

        // Metadata: serverTimestamp ≈ fecha del último servicio más reciente
        let lastTs = null;
        for (const r of combined) {
            const f = r.fecha_servicio;
            if (!f) continue;
            const ts = new Date(f).getTime();
            if (!isNaN(ts) && (lastTs == null || ts > lastTs)) lastTs = ts;
        }
        const serverTimestamp = lastTs ? new Date(lastTs).toISOString() : null;
        const metadata = {
            serverTimestamp,
            rowCount: combined.length,
            otsCount: ots.length,
            informesCount: informes.length,
        };

        recordLoadSuccess();
        return { data: normalized, metadata, source: "live" };
    } catch (err) {
        if (err?.name === "AbortError") {
            return { data: null, skipped: true };
        }
        recordLoadError();
        return {
            data: null,
            error: err?.message ?? "Error al cargar datos",
        };
    } finally {
        if (myGen === currentLoadGen) {
            isLoading = false;
        }
    }
}

// === Normalización snake_case → "Sheet-like" ===
//
// Las filas de Postgres llegan con snake_case (`fecha_servicio`,
// `tipo_trabajo_final`). El resto del dashboard espera el shape
// heredado del Sheet (`Fecha_Servicio`, `Tipo_Trabajo_Final`, etc.).
// Esta capa aísla esa traducción — el resto del dashboard ignora
// el schema real de la BD.

const KEY_MAP = {
    tecnico: "Técnico",
    cliente: "Cliente",
    equipo: "Equipo",
    marca: "Marca",
    fecha_servicio: "Fecha_Servicio",
    tipo_trabajo_final: "Tipo_Trabajo_Final",
    tipo_falla_final: "Tipo_Falla_Final",
    estado_final: "Estado_Final",
    dias_trabajados: "Días_Trabajados",
    horas_trabajadas: "Horas_Trabajadas",
    horometro: "Horómetro",
    reincidencia_equipo: "Reincidencia_Equipo",
    fuente: "Fuente",
    numero_ot: "Número_OT",
};

/** Normaliza una fila del schema Postgres al shape "Sheet-like". */
function normalizarFila(row) {
    if (!row || typeof row !== "object") return row;
    const out = { ...row };
    for (const [src, dst] of Object.entries(KEY_MAP)) {
        if (src in out) {
            out[dst] = out[src];
        }
    }
    return out;
}

/** Normaliza un array de filas. */
function normalizarFilas(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map(normalizarFila);
}

// === Parser de fechas + períodos ===
//
// Acepta múltiples formatos (DD/MM/YYYY, ISO, etc.) para tolerar
// datos viejos del Sheet mezclados con filas nuevas de Postgres.

/**
 * Parser de fecha chilena + ISO fallback.
 * Acepta: DD/MM/YYYY, DD-MM-YYYY, DD/MM/YYYY HH:mm:ss, YYYY-MM-DD, etc.
 * Devuelve Date válido o null.
 */
export function parseChileanDate(str) {
    if (!str || typeof str !== "string") return null;
    const s = str.trim();
    if (!s) return null;

    const dmyMatch = s.match(
        /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
    );
    if (dmyMatch) {
        let [, d, m, y, hh, mm, ss] = dmyMatch;
        d = parseInt(d, 10);
        m = parseInt(m, 10);
        y = parseInt(y, 10);
        if (y < 100) y = y >= 30 ? 1900 + y : 2000 + y;
        const date = new Date(
            y,
            m - 1,
            d,
            parseInt(hh || 0, 10),
            parseInt(mm || 0, 10),
            parseInt(ss || 0, 10),
        );
        if (
            date.getFullYear() === y &&
            date.getMonth() === m - 1 &&
            date.getDate() === d
        ) {
            return date;
        }
        return null;
    }

    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    return null;
}

/**
 * Período desde fecha: "Enero 2026" o null.
 */
export function getPeriodoFromRow(row) {
    const fechaStr = row["Fecha_Servicio"] || row["Fecha_Inicio"];
    if (!fechaStr) return null;
    const d = parseChileanDate(fechaStr);
    if (!d || isNaN(d.getTime())) return null;
    return MONTHS_ES[d.getMonth()] + " " + d.getFullYear();
}

/**
 * Clave de orden cronológico "YYYY-MM" para un período "Enero 2026".
 */
export function getPeriodoSortKey(periodo) {
    if (!periodo) return "0000-00";
    const [mes, anio] = periodo.split(" ");
    const mesIdx = MONTHS_ES.indexOf(mes);
    return anio + "-" + String(mesIdx + 1).padStart(2, "0");
}