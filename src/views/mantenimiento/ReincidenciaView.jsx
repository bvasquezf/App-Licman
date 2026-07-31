import DashboardShell from "../../components/mantenimiento/DashboardShell";
import KpiCard from "../../components/mantenimiento/KpiCard";
import ChartCanvas from "../../components/mantenimiento/ChartCanvas";
import DataTable from "../../components/mantenimiento/DataTable";
import { useDashboard } from "../../context/DashboardContext";
import {
    chartFallasCriticas,
    chartReincCliente,
    tableReincidencia,
} from "../../lib/dashboardPresentation";

/**
 * Reincidencia:
 *  - 4 KPIs (equipos únicos, normales, alerta, críticos)
 *  - Alert box si hay equipo crítico destacado
 *  - 2 charts (reincidencia por cliente, fallas en críticos)
 *  - Tabla top 10 equipos con reincidencia
 */
export default function ReincidenciaView() {
    const { filtered, kpis } = useDashboard();
    const rows = tableReincidencia(filtered);
    const r = kpis.reincidencia;

    const columns = [
        { key: "equipo", header: "Equipo", render: (row) => <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{row.equipo}</span> },
        { key: "cliente", header: "Cliente", render: (row) => row.cliente || "—" },
        { key: "marca", header: "Marca", render: (row) => row.marca || "—" },
        { key: "visitas", header: "Visitas", align: "right", render: (row) => <span className="font-mono">{row.visitas}</span> },
        {
            key: "reincMax",
            header: "Reinc.",
            align: "right",
            render: (row) => (
                <span
                    className={`font-mono ${
                        row.reincMax >= 4 ? "font-bold text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
                    }`}
                >
                    {row.reincMax}
                </span>
            ),
        },
        {
            key: "barra",
            header: "Intensidad",
            render: (row) => (
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <div
                        className={`h-full ${row.reincMax >= 4 ? "bg-rose-500" : "bg-amber-500"}`}
                        style={{ width: `${row.pctBar}%` }}
                    />
                </div>
            ),
        },
        {
            key: "intervalo",
            header: "Intervalo",
            align: "center",
            render: (row) => (
                <span
                    title={row.intervaloTitle}
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${row.intervaloClass}`}
                >
                    {row.intervaloText}
                </span>
            ),
        },
        {
            key: "status",
            header: "Estado",
            align: "center",
            render: (row) => (
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${row.statusClass}`}>
                    {row.statusText}
                </span>
            ),
        },
    ];

    return (
        <DashboardShell
            title="Reincidencia"
            subtitle="Equipos y clientes con mayor carga de reincidencia técnica."
        >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard title="Equipos únicos" value={r.equiposUnicos} accent="slate" />
                <KpiCard title="Normales" value={r.normales} sub={r.normalesSub} accent="emerald" />
                <KpiCard title="En alerta" value={r.alerta} sub={r.alertaSub} accent="amber" />
                <KpiCard title="Críticos" value={r.criticos} sub={r.criticosSub} accent="rose" />
            </div>

            {r.equipoMasCritico && (
                <div
                    id="alert-box"
                    role="alert"
                    className="rounded-[14px] border-l-4 border-rose-600 bg-rose-50 p-4 shadow-sm sm:p-5 dark:bg-rose-500/10"
                >
                    <p className="text-base font-bold text-rose-900 dark:text-rose-300">
                        ⚠ Equipo {r.equipoMasCritico.equipo} —{" "}
                        {r.equipoMasCritico.cliente}: foco crítico de
                        reincidencia
                    </p>
                    <p className="mt-1 text-sm text-rose-800 dark:text-rose-200">
                        Ha requerido{" "}
                        <strong className="font-bold">
                            {r.equipoMasCritico.reinc} visitas
                        </strong>
                        . Concentra{" "}
                        <strong className="font-bold">
                            {r.equipoMasCritico.pctTotal}%
                        </strong>{" "}
                        de toda la actividad técnica. Evaluar mantenimiento
                        profundo o reemplazo.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <article className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.10)] sm:p-6 dark:border-white/10 dark:bg-carbon-900">
                    <h2 className="text-[1.05rem] font-bold text-slate-900 dark:text-slate-100">
                        Reincidencia por cliente (Top 10)
                    </h2>
                    <div className="mt-3">
                        <ChartCanvas
                            id="chart-reinc-cliente"
                            factory={chartReincCliente}
                            filtered={filtered}
                            height={300}
                        />
                    </div>
                </article>
                <article className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.10)] sm:p-6 dark:border-white/10 dark:bg-carbon-900">
                    <h2 className="text-[1.05rem] font-bold text-slate-900 dark:text-slate-100">
                        Fallas en equipos críticos
                    </h2>
                    <div className="mt-3">
                        <ChartCanvas
                            id="chart-fallas-criticas"
                            factory={chartFallasCriticas}
                            filtered={filtered}
                            height={300}
                        />
                    </div>
                </article>
            </div>

            <article className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.10)] sm:p-6 dark:border-white/10 dark:bg-carbon-900">
                <h2 className="text-[1.05rem] font-bold text-slate-900 dark:text-slate-100">
                    Top 10 equipos con mayor reincidencia
                </h2>
                <div className="mt-3">
                    <DataTable
                        columns={columns}
                        rows={rows}
                        emptyLabel="No hay equipos con reincidencia ≥ 2 en el período"
                    />
                </div>
            </article>
        </DashboardShell>
    );
}