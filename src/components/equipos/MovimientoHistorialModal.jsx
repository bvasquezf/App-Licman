import { useCallback, useEffect, useState } from "react";
import { useAsync } from "../../hooks/useAsync";
import { supabase } from "../../services/supabase";
import { formatearFecha } from "../../utils/format";
import { iconoPorMotivo } from "../../lib/equiposConstants";
import { getFotoUrlCached } from "../../lib/equiposStorage";

const CATEGORIA_LABEL = {
    renovacion: "Renovación",
    garantia: "Garantía",
    fallo: "Fallo postventa",
};

/**
 * Modal que muestra el historial completo de movimientos de un equipo.
 *
 * Carga on-demand desde Supabase con JOIN a `clientes` y `equipos`
 * (para mostrar razón social del cliente y equipo relacionado en swap).
 *
 * Si los aliases PostgREST fallan (por nomenclatura del FK), hace
 * fallback a dos queries paralelas + map en cliente.
 */
export default function MovimientoHistorialModal({ open, equipo, onClose }) {
    const cargarHistorial = useCallback(async () => {
        if (!equipo?.id || !supabase) return [];
        // Query principal con JOIN. PostgREST embedded resources.
        const { data, error: err } = await supabase
            .from("equipos_movimientos")
            .select(
                `
                *,
                cliente_origen:clientes!equipos_movimientos_cliente_origen_id_fkey(id, razon_social),
                cliente_destino:clientes!equipos_movimientos_cliente_destino_id_fkey(id, razon_social),
                equipo_relacionado:equipos!equipos_movimientos_equipo_relacionado_id_fkey(id, correlativo, marca, modelo, numero_interno)
                `,
            )
            .eq("equipo_id", equipo.id)
            .order("fecha", { ascending: false });

        if (!err) return data ?? [];

        // Fallback: si los aliases no resuelven, cargar por separado
        const fallback = await cargarFallback(equipo.id);
        if (fallback.error) throw new Error(fallback.error);
        return fallback.movimientos;
    }, [equipo?.id]);

    const {
        data: movimientos = [],
        loading: cargando,
        error,
    } = useAsync(cargarHistorial, {
        immediate: open,
        deps: [open, equipo?.id],
        errorContexto: "cargar historial de movimientos",
    });

    useEffect(() => {
        if (!open) return undefined;
        const handler = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    if (!open || !equipo) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="historial-mov-titulo"
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6 dark:bg-carbon-900">
                <header className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2
                            id="historial-mov-titulo"
                            className="text-[1.15rem] font-bold text-slate-900 dark:text-slate-100"
                        >
                            📜 Historial de movimientos
                        </h2>
                        <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                            {equipo.marca} {equipo.modelo} ·{" "}
                            <span className="font-mono font-semibold">
                                {equipo.numero_interno}
                            </span>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-5 w-5"
                        >
                            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                        </svg>
                    </button>
                </header>

                {cargando && (
                    <div className="rounded-[10px] border-2 border-dashed border-slate-300 px-5 py-7 text-center text-sm text-slate-500 dark:border-white/15 dark:text-neutral-400">
                        Cargando movimientos…
                    </div>
                )}

                {error && (
                    <div className="rounded-[10px] border-l-4 border-rose-600 bg-rose-50 px-3 py-2.5 text-sm text-rose-900 dark:bg-rose-500/10 dark:text-rose-300">
                        Error al cargar: {error}
                    </div>
                )}

                {!cargando && !error && movimientos.length === 0 && (
                    <div className="rounded-[10px] border-2 border-dashed border-slate-300 px-5 py-7 text-center text-sm text-slate-500 dark:border-white/15 dark:text-neutral-400">
                        Este equipo aún no tiene movimientos registrados.{" "}
                        <strong>
                            Solo se registran traslados posteriores al alta.
                        </strong>
                    </div>
                )}

                {!cargando && !error && movimientos.length > 0 && (
                    <ol className="relative">
                        {movimientos.map((m, idx) => {
                            const esUltimo = idx === 0;
                            const siguienteMasNuevo = movimientos[idx - 1];
                            const desde = new Date(m.fecha);
                            const hasta = esUltimo
                                ? new Date()
                                : new Date(siguienteMasNuevo.fecha);
                            const duracion = duracionLegible(hasta - desde);

                            return (
                                <li
                                    key={m.id}
                                    className="relative pb-4 pl-12 last:pb-0"
                                >
                                    {/* Línea conectora del timeline */}
                                    {idx < movimientos.length - 1 && (
                                        <span
                                            className="absolute left-[19px] top-10 bottom-0 w-px bg-slate-200 dark:bg-white/10"
                                            aria-hidden="true"
                                        />
                                    )}
                                    {/* Nodo con icono del tipo de movimiento */}
                                    <span
                                        className={`absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full text-base ${
                                            esUltimo
                                                ? "bg-brand-600 text-white shadow-[0_2px_8px_rgba(232,18,26,0.35)]"
                                                : "bg-slate-900 text-white dark:bg-white/10"
                                        }`}
                                        aria-hidden="true"
                                    >
                                        {iconoPorMotivo(m.motivo)}
                                    </span>

                                    <div
                                        className={`rounded-[10px] border p-3 ${
                                            esUltimo
                                                ? "border-brand-300 bg-brand-50/50 dark:border-brand-500/30 dark:bg-brand-500/10"
                                                : "border-slate-200 bg-white dark:border-white/10 dark:bg-carbon-800"
                                        }`}
                                    >
                                        <div className="flex flex-wrap items-center gap-2 text-sm">
                                            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-white dark:bg-white/10">
                                                {formatearFecha(m.fecha)}
                                            </span>
                                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[0.7rem] font-bold text-violet-800 dark:bg-violet-500/10 dark:text-violet-400">
                                                {m.motivo}
                                            </span>
                                            {m.movimiento_padre_id && (
                                                <span
                                                    className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.7rem] font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-400"
                                                    title="Esta fila es parte de un cambio de equipo (swap) bidireccional"
                                                >
                                                    🔁 Pierna de swap
                                                </span>
                                            )}
                                            {m.categoria && (
                                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[0.7rem] font-bold text-sky-800 dark:bg-sky-500/10 dark:text-sky-400">
                                                    {CATEGORIA_LABEL[
                                                        m.categoria
                                                    ] ?? m.categoria}
                                                </span>
                                            )}
                                            {esUltimo && (
                                                <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-white">
                                                    Actual
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-2 text-[0.92rem] font-semibold text-slate-900 dark:text-slate-100">
                                            {renderOrigen(m)}
                                            <span className="mx-2 text-slate-400 dark:text-neutral-500">
                                                →
                                            </span>
                                            <span className="text-brand-700 dark:text-brand-400">
                                                {renderDestino(m)}
                                            </span>
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                                            ⏱️{" "}
                                            {esUltimo
                                                ? `Lleva ${duracion} aquí`
                                                : `Estuvo ${duracion} en este destino`}
                                        </p>
                                        {(m.ubicacion_origen ||
                                            m.ubicacion_destino) && (
                                            <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                                                {m.ubicacion_origen ?? "—"}
                                                <span className="mx-1.5 text-slate-400 dark:text-neutral-500">
                                                    →
                                                </span>
                                                <span className="font-medium text-slate-700 dark:text-slate-200">
                                                    {m.ubicacion_destino ?? "—"}
                                                </span>
                                            </p>
                                        )}
                                        {m.equipo_relacionado && (
                                            <p className="mt-1 text-xs text-slate-600 dark:text-neutral-400">
                                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                                    Equipo relacionado:{" "}
                                                </span>
                                                #
                                                {String(
                                                    m.equipo_relacionado
                                                        .correlativo,
                                                ).padStart(4, "0")}{" "}
                                                · {m.equipo_relacionado.marca}{" "}
                                                {m.equipo_relacionado.modelo}
                                                {m.equipo_relacionado
                                                    .numero_interno && (
                                                    <>
                                                        {" "}
                                                        ·{" "}
                                                        <span className="font-mono">
                                                            {
                                                                m
                                                                    .equipo_relacionado
                                                                    .numero_interno
                                                            }
                                                        </span>
                                                    </>
                                                )}
                                            </p>
                                        )}
                                        <p className="mt-1.5 text-xs text-slate-500 dark:text-neutral-400">
                                            👤{" "}
                                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                                                {m.responsable}
                                            </span>
                                        </p>
                                        {m.notas && (
                                            <p className="mt-1.5 rounded border-l-[3px] border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200">
                                                {m.notas}
                                            </p>
                                        )}
                                        {m.foto_url && (
                                            <MovimientoFoto
                                                path={m.foto_url}
                                            />
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </div>
        </div>
    );
}

function renderOrigen(m) {
    if (m.cliente_origen?.razon_social) {
        return `🏢 ${m.cliente_origen.razon_social}`;
    }
    return m.bodega_origen ?? "—";
}

function renderDestino(m) {
    if (m.cliente_destino?.razon_social) {
        return `🏢 ${m.cliente_destino.razon_social}`;
    }
    if (m.destino_externo) return `🔧 ${m.destino_externo}`;
    return m.bodega_destino ?? "—";
}

/**
 * Convierte un intervalo en ms a texto legible:
 * "menos de 1 día", "1 día", "45 días", "~3 meses".
 */
function duracionLegible(ms) {
    const dias = Math.floor(ms / 86400000);
    if (dias < 1) return "menos de 1 día";
    if (dias === 1) return "1 día";
    if (dias < 60) return `${dias} días`;
    const meses = Math.round(dias / 30);
    return `~${meses} ${meses === 1 ? "mes" : "meses"}`;
}

/**
 * Thumbnail de la foto adjunta a un movimiento. El path vive en un
 * bucket privado: resuelve la signed URL on-demand (con cache) y al
 * hacer click abre la imagen completa en pestaña nueva.
 */
function MovimientoFoto({ path }) {
    const [url, setUrl] = useState(null);

    useEffect(() => {
        let vivo = true;
        getFotoUrlCached(path).then((u) => {
            if (vivo) setUrl(u);
        });
        return () => {
            vivo = false;
        };
    }, [path]);

    if (!url) return null;

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block"
            title="Ver foto completa"
        >
            <img
                src={url}
                alt="Foto del movimiento"
                className="h-16 w-16 rounded-[8px] border border-slate-200 object-cover transition hover:opacity-80 dark:border-white/15"
                loading="lazy"
            />
        </a>
    );
}

/**
 * Fallback cuando los aliases PostgREST no resuelven correctamente.
 * Carga los movimientos, luego los clientes y equipo relacionado por
 * separado y los une en cliente.
 */
async function cargarFallback(equipoId) {
    try {
        const { data: movs, error: movErr } = await supabase
            .from("equipos_movimientos")
            .select("*")
            .eq("equipo_id", equipoId)
            .order("fecha", { ascending: false });
        if (movErr) return { error: movErr.message };

        const clienteIds = new Set();
        const equipoRelIds = new Set();
        for (const m of movs ?? []) {
            if (m.cliente_origen_id) clienteIds.add(m.cliente_origen_id);
            if (m.cliente_destino_id) clienteIds.add(m.cliente_destino_id);
            if (m.equipo_relacionado_id)
                equipoRelIds.add(m.equipo_relacionado_id);
        }

        const clientesById = new Map();
        if (clienteIds.size > 0) {
            const { data: clientes } = await supabase
                .from("clientes")
                .select("id, razon_social")
                .in("id", [...clienteIds]);
            for (const c of clientes ?? []) clientesById.set(c.id, c);
        }

        const equiposById = new Map();
        if (equipoRelIds.size > 0) {
            const { data: equipos } = await supabase
                .from("equipos")
                .select("id, correlativo, marca, modelo, numero_interno")
                .in("id", [...equipoRelIds]);
            for (const e of equipos ?? []) equiposById.set(e.id, e);
        }

        const movimientos = (movs ?? []).map((m) => ({
            ...m,
            cliente_origen: clientesById.get(m.cliente_origen_id) ?? null,
            cliente_destino: clientesById.get(m.cliente_destino_id) ?? null,
            equipo_relacionado: equiposById.get(m.equipo_relacionado_id) ?? null,
        }));

        return { movimientos };
    } catch (err) {
        return { error: err?.message ?? "Error inesperado" };
    }
}