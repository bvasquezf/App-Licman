/**
 * dashboardAnalytics — Cálculo puro del dashboard.
 * -------------------------------------------------
 * Funciones que reciben `filtered` (shape "Sheet-like") y retornan
 * estructuras listas para UI:
 *   - KPIs agregados (resumen, reincidencia, tiempos)
 *   - Filtros sobre rawData
 *   - Badges de intervalo entre visitas
 *   - Utilidades defensivas (safeSum)
 *
 * No hace fetch ni render — solo transforma datos en datos.
 */

import {
    getPeriodoFromRow,
    getPeriodoSortKey,
    parseChileanDate,
} from "./dashboardData";

// === KPIs principales ===

/**
 * Computa los KPIs principales para todas las vistas.
 * Devuelve objeto con secciones: resumen, reincidencia, tiempos.
 */
export function computeKpis(filtered) {
    const total = filtered.length;
    const preventivas = filtered.filter(
        (r) => r["Tipo_Trabajo_Final"] === "Mantención/Preventiva",
    ).length;
    const correctivas = filtered.filter(
        (r) => r["Tipo_Trabajo_Final"] === "Correctiva",
    ).length;
    const otsTaller = filtered.filter((r) => r["Fuente"] === "OT Taller").length;
    const informesTerreno = filtered.filter(
        (r) => r["Fuente"] === "Informe Terreno",
    ).length;
    const reincidencias = filtered
        .map((r) => r["Reincidencia_Equipo"])
        .filter((v) => v != null && !isNaN(v));
    const reincPromedio = reincidencias.length
        ? safeSum(reincidencias) / reincidencias.length
        : 0;
    const equiposCriticos = new Set(
        filtered.filter((r) => r["Reincidencia_Equipo"] >= 4).map((r) => r["Equipo"]),
    ).size;

    const resumen = {
        total,
        totalSub: `${otsTaller} OTs + ${informesTerreno} Informes Terreno`,
        preventivas,
        preventivasPct: total ? ((preventivas * 100) / total).toFixed(1) + "%" : "—",
        preventivasSub: `${preventivas} OTs de mantenimiento preventivo`,
        correctivas,
        correctivasPct: total ? ((correctivas * 100) / total).toFixed(1) + "%" : "—",
        correctivasSub: `${correctivas} OTs correctivas (alta carga)`,
        reincPromedio: reincPromedio.toFixed(2),
        equiposCriticos,
    };

    // Distribución por equipo (reincidencia máxima)
    const equiposCounts = {};
    filtered.forEach((r) => {
        if (r["Equipo"] != null) {
            const k = r["Equipo"];
            if (
                !equiposCounts[k] ||
                r["Reincidencia_Equipo"] > equiposCounts[k]
            )
                equiposCounts[k] = r["Reincidencia_Equipo"];
        }
    });
    const normales = Object.values(equiposCounts).filter((v) => v === 1).length;
    const alerta = Object.values(equiposCounts).filter(
        (v) => v >= 2 && v <= 3,
    ).length;
    const criticos = Object.values(equiposCounts).filter((v) => v >= 4).length;
    const totalEquipos = Object.keys(equiposCounts).length;

    const reincidencia = {
        equiposUnicos: totalEquipos,
        normales,
        normalesSub: totalEquipos
            ? ((normales * 100) / totalEquipos).toFixed(1) + "% de los equipos"
            : "—",
        alerta,
        alertaSub: totalEquipos
            ? ((alerta * 100) / totalEquipos).toFixed(1) + "% requiere seguimiento"
            : "—",
        criticos,
        criticosSub: totalEquipos
            ? ((criticos * 100) / totalEquipos).toFixed(1) + "% foco prioritario"
            : "—",
        equipoMasCritico: (() => {
            const sorted = Object.entries(equiposCounts).sort(
                (a, b) => b[1] - a[1],
            );
            const top = sorted[0];
            if (!top || top[1] < 4) return null;
            const eq = top[0];
            const cliente =
                filtered.find((r) => r["Equipo"] == eq && r["Cliente"])?.[
                    "Cliente"
                ] || "Sin cliente";
            return {
                equipo: eq,
                cliente,
                reinc: top[1],
                pctTotal: ((top[1] * 100) / total).toFixed(1),
            };
        })(),
    };

    // Tiempos
    const otsConHoras = filtered.filter(
        (r) => r["Fuente"] === "OT Taller" && r["Horas_Trabajadas"] != null,
    );
    const otsConDias = filtered.filter(
        (r) => r["Fuente"] === "OT Taller" && r["Días_Trabajados"] != null,
    );
    const durProm = otsConDias.length
        ? safeSum(otsConDias.map((r) => r["Días_Trabajados"])) / otsConDias.length
        : 0;
    const horProm = otsConHoras.length
        ? safeSum(otsConHoras.map((r) => r["Horas_Trabajadas"])) / otsConHoras.length
        : 0;
    const otMasLarga = otsConDias.length
        ? Math.max(...otsConDias.map((r) => r["Días_Trabajados"]))
        : 0;
    const otMasLargaHoras =
        otsConDias.find((r) => r["Días_Trabajados"] === otMasLarga)?.[
            "Horas_Trabajadas"
        ] || 0;

    const tiempos = {
        otsConHoras: otsConHoras.length,
        duracion: durProm.toFixed(1) + " días",
        horas: horProm.toFixed(1) + " h",
        otLarga: otMasLarga + " días",
        otLargaSub: otMasLargaHoras.toFixed(1) + " horas trabajadas",
    };

    return { resumen, reincidencia, tiempos };
}

// === Intervalo entre visitas ===

/**
 * Intervalo promedio entre visitas consecutivas de un equipo.
 * Devuelve número (días) o null si hay menos de 2 visitas con fecha válida.
 */
export function getAvgIntervaloForEquipo(rows) {
    const fechas = rows
        .map((r) => parseChileanDate(r["Fecha_Servicio"] || r["Fecha_Inicio"]))
        .filter((d) => d && !isNaN(d.getTime()))
        .sort((a, b) => a - b);
    if (fechas.length < 2) return null;
    const intervalos = [];
    for (let i = 1; i < fechas.length; i++) {
        const diffMs = fechas[i] - fechas[i - 1];
        const diffDias = diffMs / (1000 * 60 * 60 * 24);
        intervalos.push(diffDias);
    }
    return intervalos.reduce((a, b) => a + b, 0) / intervalos.length;
}

/**
 * Badge de intervalo: <7 rojo, <30 amarillo, ≥30 verde.
 * Retorna { className, text, title } para usar con className condicional.
 */
export function getIntervaloBadge(intervalo) {
    if (intervalo == null) {
        return {
            className:
                "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-neutral-300",
            text: "—",
            title: "Menos de 2 visitas con fecha — no se puede calcular",
        };
    }
    const dias = Math.round(intervalo);
    if (dias < 7) {
        return {
            className:
                "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
            text: `${dias} día${dias === 1 ? "" : "s"}`,
            title: "Promedio entre visitas consecutivas",
        };
    }
    if (dias < 30) {
        return {
            className:
                "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
            text: `${dias} días`,
            title: "Promedio entre visitas consecutivas",
        };
    }
    return {
        className:
            "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
        text: `${dias} días`,
        title: "Promedio entre visitas consecutivas",
    };
}

// === Filtros ===

/**
 * Puebla las opciones de los selects de filtro desde los datos crudos.
 * Retorna { tecnicos, clientes, periodos }
 */
export function populateFilterOptions(rawData) {
    try {
        const tecnicos = [
            ...new Set(
                rawData.map((r) => r["Técnico"]).filter(Boolean),
            ),
        ].sort();
        const clientes = [
            ...new Set(
                rawData.map((r) => r["Cliente"]).filter(Boolean),
            ),
        ].sort();

        const periodosSet = new Set();
        rawData.forEach((r) => {
            const p = getPeriodoFromRow(r);
            if (p) periodosSet.add(p);
        });
        const periodos = [...periodosSet].sort((a, b) =>
            getPeriodoSortKey(a).localeCompare(getPeriodoSortKey(b)),
        );

        return { tecnicos, clientes, periodos };
    } catch {
        return { tecnicos: [], clientes: [], periodos: [] };
    }
}

/**
 * Aplica los filtros sobre rawData → filtered.
 * filters: { tecnico, cliente, fuente, periodo }
 */
export function applyFilters(rawData, filters) {
    const { tecnico, cliente, fuente, periodo } = filters || {};
    return rawData.filter((r) => {
        if (tecnico && r["Técnico"] !== tecnico) return false;
        if (cliente && r["Cliente"] !== cliente) return false;
        if (fuente && r["Fuente"] !== fuente) return false;
        if (periodo) {
            const rowPeriodo = getPeriodoFromRow(r);
            if (rowPeriodo !== periodo) return false;
        }
        return true;
    });
}

export function resetFilters() {
    return {
        tecnico: "",
        cliente: "",
        fuente: "",
        periodo: "",
    };
}

// === Utilidades defensivas ===

/** Suma defensiva que ignora no-numéricos. */
export function safeSum(arr) {
    return arr.reduce(function (acc, v) {
        return acc + (Number(v) || 0);
    }, 0);
}