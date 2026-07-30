/**
 * dashboardPresentation — Capa de presentación del dashboard.
 * -------------------------------------------------------------
 * Configuraciones de Chart.js v4 (11 charts) + factories de filas
 * para las 3 tablas que consume DataTable.jsx.
 *
 * Recibe `filtered` (shape "Sheet-like" desde dashboardData.js) y
 * retorna objetos { type, data, options } listos para ChartCanvas,
 * o arrays de objetos listos para DataTable.
 */

import { safeSum, getAvgIntervaloForEquipo, getIntervaloBadge } from "./dashboardAnalytics";

// === Charts (Chart.js v4) ===

// 1. Distribución Tipo de Trabajo (doughnut)
export function chartTipo(filtered) {
    const tipoCount = {};
    filtered.forEach((r) => {
        const t = r["Tipo_Trabajo_Final"];
        if (t) tipoCount[t] = (tipoCount[t] || 0) + 1;
    });
    return {
        type: "doughnut",
        data: {
            labels: Object.keys(tipoCount),
            datasets: [
                {
                    data: Object.values(tipoCount),
                    backgroundColor: [
                        "#f59e0b",
                        "#3b82f6",
                        "#10b981",
                        "#94a3b8",
                        "#06b6d4",
                    ],
                    borderWidth: 0,
                },
            ],
        },
        options: {
            cutout: "65%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { padding: 12, font: { size: 12 } },
                },
            },
        },
    };
}

// 2. Actividad por Técnico (bar horizontal)
export function chartTecnicos(filtered) {
    const tecCount = {};
    filtered.forEach((r) => {
        const t = r["Técnico"];
        if (t) tecCount[t] = (tecCount[t] || 0) + 1;
    });
    const tecSorted = Object.entries(tecCount).sort((a, b) => b[1] - a[1]);
    return {
        type: "bar",
        data: {
            labels: tecSorted.map((t) => t[0]),
            datasets: [
                {
                    label: "Total",
                    data: tecSorted.map((t) => t[1]),
                    backgroundColor: "#3b82f6",
                    borderRadius: 6,
                },
            ],
        },
        options: {
            indexAxis: "y",
            plugins: { legend: { display: false } },
            scales: { x: { grid: { display: false } } },
        },
    };
}

// 3. Tendencia Mensual (line con dos series)
export function chartMensual(filtered) {
    const monthCounts = {};
    filtered.forEach((r) => {
        const fecha = r["Fecha_Servicio"] || r["Fecha_Inicio"];
        if (fecha) {
            const d = new Date(fecha);
            const key =
                d.getFullYear() +
                "-" +
                String(d.getMonth() + 1).padStart(2, "0");
            const label = d.toLocaleDateString("es-ES", {
                month: "short",
                year: "2-digit",
            });
            if (!monthCounts[key]) monthCounts[key] = { label, OT: 0, Terreno: 0 };
            if (r["Fuente"] === "OT Taller") monthCounts[key].OT++;
            else if (r["Fuente"] === "Informe Terreno") monthCounts[key].Terreno++;
        }
    });
    const sortedMonths = Object.entries(monthCounts).sort((a, b) =>
        a[0].localeCompare(b[0]),
    );
    return {
        type: "line",
        data: {
            labels: sortedMonths.map((m) => m[1].label),
            datasets: [
                {
                    label: "OT Taller",
                    data: sortedMonths.map((m) => m[1].OT),
                    borderColor: "#3b82f6",
                    backgroundColor: "rgba(59,130,246,0.1)",
                    tension: 0.35,
                    fill: true,
                },
                {
                    label: "Informe Terreno",
                    data: sortedMonths.map((m) => m[1].Terreno),
                    borderColor: "#10b981",
                    backgroundColor: "rgba(16,185,129,0.1)",
                    tension: 0.35,
                    fill: true,
                },
            ],
        },
        options: {
            plugins: { legend: { position: "top", align: "end" } },
            scales: { y: { beginAtZero: true } },
        },
    };
}

// 4. Tipos de Falla más Frecuentes (bar vertical)
export function chartFallas(filtered) {
    const fallaCount = {};
    filtered.forEach((r) => {
        const f = r["Tipo_Falla_Final"];
        if (f) fallaCount[f] = (fallaCount[f] || 0) + 1;
    });
    return {
        type: "bar",
        data: {
            labels: Object.keys(fallaCount),
            datasets: [
                {
                    data: Object.values(fallaCount),
                    backgroundColor: [
                        "#3b82f6",
                        "#06b6d4",
                        "#94a3b8",
                        "#f59e0b",
                        "#ef4444",
                    ],
                    borderRadius: 6,
                },
            ],
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } },
        },
    };
}

// 5. Top 8 Clientes (bar vertical)
export function chartClientes(filtered) {
    const cliCount = {};
    filtered.forEach((r) => {
        if (r["Fuente"] === "Informe Terreno" && r["Cliente"])
            cliCount[r["Cliente"]] = (cliCount[r["Cliente"]] || 0) + 1;
    });
    const cliSorted = Object.entries(cliCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    return {
        type: "bar",
        data: {
            labels: cliSorted.map((c) => c[0]),
            datasets: [
                {
                    data: cliSorted.map((c) => c[1]),
                    backgroundColor: "#6366f1",
                    borderRadius: 6,
                },
            ],
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } },
        },
    };
}

// 6. Mix de Trabajo por Técnico (Top 5, bar apilado)
export function chartMix(filtered) {
    const tecTipos = {};
    filtered.forEach((r) => {
        const t = r["Técnico"];
        const tipo = r["Tipo_Trabajo_Final"];
        if (t && tipo) {
            if (!tecTipos[t])
                tecTipos[t] = {
                    "Mantención/Preventiva": 0,
                    Correctiva: 0,
                    "Diagnóstico/Revisión": 0,
                };
            if (tecTipos[t][tipo] !== undefined) tecTipos[t][tipo]++;
        }
    });
    const tecTop5 = Object.entries(tecTipos)
        .map(([k, v]) => ({ k, total: safeSum(Object.values(v)), ...v }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    return {
        type: "bar",
        data: {
            labels: tecTop5.map((t) => t.k),
            datasets: [
                {
                    label: "Preventiva",
                    data: tecTop5.map((t) => t["Mantención/Preventiva"] || 0),
                    backgroundColor: "#10b981",
                    borderRadius: 4,
                    stack: "s",
                },
                {
                    label: "Correctiva",
                    data: tecTop5.map((t) => t.Correctiva || 0),
                    backgroundColor: "#f59e0b",
                    borderRadius: 4,
                    stack: "s",
                },
                {
                    label: "Diagnóstico",
                    data: tecTop5.map((t) => t["Diagnóstico/Revisión"] || 0),
                    backgroundColor: "#3b82f6",
                    borderRadius: 4,
                    stack: "s",
                },
            ],
        },
        options: {
            plugins: { legend: { position: "bottom" } },
            scales: { x: { stacked: true }, y: { stacked: true } },
        },
    };
}

// 7. Estado Final por Técnico (Top 5, bar apilado)
export function chartEstado(filtered) {
    const tecEstado = {};
    filtered.forEach((r) => {
        const t = r["Técnico"];
        const est = r["Estado_Final"];
        if (t && est) {
            if (!tecEstado[t])
                tecEstado[t] = {
                    Operativo: 0,
                    "Pendiente/Observación": 0,
                    "No informado": 0,
                };
            if (tecEstado[t][est] !== undefined) tecEstado[t][est]++;
        }
    });
    const tecEstadoTop = Object.entries(tecEstado)
        .map(([k, v]) => ({ k, total: safeSum(Object.values(v)), ...v }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    return {
        type: "bar",
        data: {
            labels: tecEstadoTop.map((t) => t.k),
            datasets: [
                {
                    label: "Operativo",
                    data: tecEstadoTop.map((t) => t.Operativo || 0),
                    backgroundColor: "#10b981",
                    borderRadius: 4,
                    stack: "s",
                },
                {
                    label: "Pendiente",
                    data: tecEstadoTop.map((t) => t["Pendiente/Observación"] || 0),
                    backgroundColor: "#f59e0b",
                    borderRadius: 4,
                    stack: "s",
                },
                {
                    label: "No informado",
                    data: tecEstadoTop.map((t) => t["No informado"] || 0),
                    backgroundColor: "#cbd5e1",
                    borderRadius: 4,
                    stack: "s",
                },
            ],
        },
        options: {
            plugins: { legend: { position: "bottom" } },
            scales: { x: { stacked: true }, y: { stacked: true } },
        },
    };
}

// 8. Reincidencia por Cliente (bar horizontal con colores por nivel)
export function chartReincCliente(filtered) {
    const cliReinc = {};
    filtered.forEach((r) => {
        if (r["Cliente"] && r["Reincidencia_Equipo"]) {
            if (!cliReinc[r["Cliente"]]) cliReinc[r["Cliente"]] = 0;
            cliReinc[r["Cliente"]] = Math.max(
                cliReinc[r["Cliente"]],
                r["Reincidencia_Equipo"],
            );
        }
    });
    const cliReincArr = Object.entries(cliReinc)
        .filter(([, v]) => v >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    return {
        type: "bar",
        data: {
            labels: cliReincArr.map((c) => c[0]),
            datasets: [
                {
                    data: cliReincArr.map((c) => c[1]),
                    backgroundColor: cliReincArr.map((c) =>
                        c[1] >= 4 ? "#dc2626" : c[1] >= 3 ? "#f59e0b" : "#fbbf24",
                    ),
                    borderRadius: 6,
                },
            ],
        },
        options: {
            indexAxis: "y",
            plugins: { legend: { display: false } },
        },
    };
}

// 9. Frecuencia de Fallas en Equipos Críticos (doughnut)
export function chartFallasCriticas(filtered) {
    const equiposCriticosSet = new Set(
        filtered
            .filter((r) => r["Reincidencia_Equipo"] >= 4)
            .map((r) => r["Equipo"]),
    );
    const fallasCriticas = {};
    filtered
        .filter(
            (r) => equiposCriticosSet.has(r["Equipo"]) && r["Tipo_Falla_Final"],
        )
        .forEach((r) => {
            const f = r["Tipo_Falla_Final"];
            fallasCriticas[f] = (fallasCriticas[f] || 0) + 1;
        });
    return {
        type: "doughnut",
        data: {
            labels: Object.keys(fallasCriticas),
            datasets: [
                {
                    data: Object.values(fallasCriticas),
                    backgroundColor: [
                        "#3b82f6",
                        "#06b6d4",
                        "#f59e0b",
                        "#ef4444",
                        "#94a3b8",
                    ],
                    borderWidth: 0,
                },
            ],
        },
        options: {
            cutout: "60%",
            plugins: { legend: { position: "bottom" } },
        },
    };
}

// 10. Duración Promedio por Técnico (bar con doble eje)
export function chartDuracion(filtered) {
    const tecDur = {};
    filtered
        .filter((r) => r["Fuente"] === "OT Taller" && r["Técnico"])
        .forEach((r) => {
            if (!tecDur[r["Técnico"]]) tecDur[r["Técnico"]] = { dias: [], horas: [] };
            if (r["Días_Trabajados"] != null)
                tecDur[r["Técnico"]].dias.push(r["Días_Trabajados"]);
            if (r["Horas_Trabajadas"] != null)
                tecDur[r["Técnico"]].horas.push(r["Horas_Trabajadas"]);
        });
    const tecDurArr = Object.entries(tecDur)
        .map(([k, v]) => ({
            k,
            dias: v.dias.length ? safeSum(v.dias) / v.dias.length : 0,
            horas: v.horas.length ? safeSum(v.horas) / v.horas.length : 0,
        }))
        .filter((t) => t.dias > 0);
    return {
        type: "bar",
        data: {
            labels: tecDurArr.map((t) => t.k),
            datasets: [
                {
                    label: "Días promedio",
                    data: tecDurArr.map((t) => +t.dias.toFixed(1)),
                    backgroundColor: "#3b82f6",
                    borderRadius: 6,
                    yAxisID: "y",
                },
                {
                    label: "Horas promedio",
                    data: tecDurArr.map((t) => +t.horas.toFixed(1)),
                    backgroundColor: "#10b981",
                    borderRadius: 6,
                    yAxisID: "y1",
                },
            ],
        },
        options: {
            plugins: { legend: { position: "bottom" } },
            scales: {
                y: { position: "left", title: { display: true, text: "Días" } },
                y1: {
                    position: "right",
                    title: { display: true, text: "Horas" },
                    grid: { drawOnChartArea: false },
                },
            },
        },
    };
}

// 11. Distribución de Duración de OTs (bar con colores por nivel)
export function chartDistDuracion(filtered) {
    const distDur = {
        "1 día": 0,
        "2 días": 0,
        "3 días": 0,
        "4 días": 0,
        "5+ días": 0,
    };
    filtered
        .filter((r) => r["Fuente"] === "OT Taller" && r["Días_Trabajados"] != null)
        .forEach((r) => {
            const d = r["Días_Trabajados"];
            if (d === 1) distDur["1 día"]++;
            else if (d === 2) distDur["2 días"]++;
            else if (d === 3) distDur["3 días"]++;
            else if (d === 4) distDur["4 días"]++;
            else distDur["5+ días"]++;
        });
    return {
        type: "bar",
        data: {
            labels: Object.keys(distDur),
            datasets: [
                {
                    data: Object.values(distDur),
                    backgroundColor: [
                        "#10b981",
                        "#10b981",
                        "#3b82f6",
                        "#f59e0b",
                        "#ef4444",
                    ],
                    borderRadius: 6,
                },
            ],
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } },
        },
    };
}

// === Tablas (consumidas por DataTable.jsx) ===

// Tabla 1: Productividad por Técnico
export function tableTecnicos(filtered) {
    const tecStats = {};
    filtered.forEach((r) => {
        const t = r["Técnico"];
        if (!t) return;
        if (!tecStats[t])
            tecStats[t] = {
                nombre: t,
                esp: r["Especialidad"],
                total: 0,
                prev: 0,
                corr: 0,
                diag: 0,
                op: 0,
                reinc: [],
            };
        tecStats[t].total++;
        if (r["Tipo_Trabajo_Final"] === "Mantención/Preventiva") tecStats[t].prev++;
        else if (r["Tipo_Trabajo_Final"] === "Correctiva") tecStats[t].corr++;
        else if (r["Tipo_Trabajo_Final"] === "Diagnóstico/Revisión")
            tecStats[t].diag++;
        if (r["Estado_Final"] === "Operativo") tecStats[t].op++;
        if (r["Reincidencia_Equipo"] != null)
            tecStats[t].reinc.push(r["Reincidencia_Equipo"]);
    });
    return Object.values(tecStats)
        .map((t) => ({
            ...t,
            pctOp: t.total ? (t.op * 100) / t.total : 0,
            pctOpLabel: t.total ? ((t.op * 100) / t.total).toFixed(0) + "%" : "—",
            reincProm: t.reinc.length
                ? (safeSum(t.reinc) / t.reinc.length).toFixed(2)
                : "—",
        }))
        .sort((a, b) => b.total - a.total);
}

// Tabla 2: Top 10 Equipos con Mayor Reincidencia
export function tableReincidencia(filtered) {
    const eqStats = {};
    filtered.forEach((r) => {
        const eq = r["Equipo"];
        if (eq == null) return;
        if (!eqStats[eq])
            eqStats[eq] = {
                equipo: eq,
                cliente: r["Cliente"],
                marca: r["Marca"],
                visitas: 0,
                reincMax: 0,
                rows: [],
            };
        eqStats[eq].visitas++;
        if (
            r["Reincidencia_Equipo"] != null &&
            r["Reincidencia_Equipo"] > eqStats[eq].reincMax
        )
            eqStats[eq].reincMax = r["Reincidencia_Equipo"];
        eqStats[eq].rows.push(r);
    });
    const arr = Object.values(eqStats)
        .filter((e) => e.reincMax >= 2)
        .sort((a, b) => b.reincMax - a.reincMax)
        .slice(0, 10);
    const maxReinc = Math.max(...arr.map((e) => e.reincMax), 1);
    return arr.map((e) => {
        const intervalo = getAvgIntervaloForEquipo(e.rows);
        const intervaloBadge = getIntervaloBadge(intervalo);
        return {
            equipo: e.equipo,
            cliente: e.cliente,
            marca: e.marca,
            visitas: e.visitas,
            reincMax: e.reincMax,
            pctBar: (e.reincMax / maxReinc) * 100,
            intervaloClass: intervaloBadge.className,
            intervaloText: intervaloBadge.text,
            intervaloTitle: intervaloBadge.title,
            statusClass:
                e.reincMax >= 4
                    ? "bg-rose-100 text-rose-700"
                    : "bg-amber-100 text-amber-700",
            statusText: e.reincMax >= 4 ? "Crítico" : "Alerta",
        };
    });
}

// Tabla 3: Detalle de OTs por Técnico (tiempos)
export function tableTiempos(filtered) {
    const tecTiempos = {};
    filtered
        .filter((r) => r["Fuente"] === "OT Taller" && r["Técnico"])
        .forEach((r) => {
            if (!tecTiempos[r["Técnico"]])
                tecTiempos[r["Técnico"]] = {
                    nombre: r["Técnico"],
                    count: 0,
                    dias: [],
                    horas: [],
                    maxDias: 0,
                };
            tecTiempos[r["Técnico"]].count++;
            if (r["Días_Trabajados"] != null) {
                tecTiempos[r["Técnico"]].dias.push(r["Días_Trabajados"]);
                if (r["Días_Trabajados"] > tecTiempos[r["Técnico"]].maxDias)
                    tecTiempos[r["Técnico"]].maxDias = r["Días_Trabajados"];
            }
            if (r["Horas_Trabajadas"] != null)
                tecTiempos[r["Técnico"]].horas.push(r["Horas_Trabajadas"]);
        });
    return Object.values(tecTiempos)
        .map((t) => ({
            ...t,
            diasProm: t.dias.length ? (safeSum(t.dias) / t.dias.length).toFixed(1) : "—",
            horasProm: t.horas.length ? (safeSum(t.horas) / t.horas.length).toFixed(1) : "—",
            horasTot: t.horas.length ? safeSum(t.horas).toFixed(1) : "—",
        }))
        .sort((a, b) => b.count - a.count);
}