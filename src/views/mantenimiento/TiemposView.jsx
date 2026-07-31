import DashboardShell from "../../components/mantenimiento/DashboardShell";
import KpiCard from "../../components/mantenimiento/KpiCard";
import ChartCanvas from "../../components/mantenimiento/ChartCanvas";
import DataTable from "../../components/mantenimiento/DataTable";
import { useDashboard } from "../../context/DashboardContext";
import {
    chartDistDuracion,
    chartDuracion,
    tableTiempos,
} from "../../lib/dashboardPresentation";

/**
 * Tiempos:
 *  - Info note (solo OTs Taller)
 *  - 4 KPI cards
 *  - 2 charts (duración promedio por técnico, distribución duración)
 *  - Tabla de detalle por técnico
 */
export default function TiemposView() {
    const { filtered, kpis } = useDashboard();
    const rows = tableTiempos(filtered);
    const t = kpis.tiempos;

    const columns = [
        { key: "nombre", header: "Técnico", render: (r) => <span className="font-medium text-slate-900 dark:text-slate-100">{r.nombre}</span> },
        { key: "count", header: "OTs", align: "right", render: (r) => <span className="font-mono">{r.count}</span> },
        { key: "diasProm", header: "Días prom.", align: "right", render: (r) => <span className="font-mono">{r.diasProm}</span> },
        { key: "horasProm", header: "Horas prom.", align: "right", render: (r) => <span className="font-mono">{r.horasProm}</span> },
        { key: "horasTot", header: "Horas tot.", align: "right", render: (r) => <span className="font-mono">{r.horasTot}</span> },
        {
            key: "maxDias",
            header: "OT más larga",
            align: "right",
            render: (r) => (
                <span className={`font-mono ${r.maxDias >= 10 ? "font-bold text-rose-600 dark:text-rose-400" : ""}`}>
                    {r.maxDias} días
                </span>
            ),
        },
    ];

    return (
        <DashboardShell
            title="Tiempos de trabajo"
            subtitle="Duración y horas-hombre dedicadas a las OTs de taller."
        >
            <div className="rounded-[14px] border-l-4 border-sky-600 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:bg-sky-500/10 dark:text-sky-300">
                Esta vista considera únicamente OTs de Taller (excluye Informes
                Terreno, que no registran horas).
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard title="OTs con horas" value={t.otsConHoras} accent="blue" />
                <KpiCard title="Duración prom." value={t.duracion} accent="emerald" />
                <KpiCard title="Horas prom. / OT" value={t.horas} accent="amber" />
                <KpiCard title="OT más larga" value={t.otLarga} sub={t.otLargaSub} accent="rose" />
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <article className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.10)] sm:p-6 dark:border-white/10 dark:bg-carbon-900">
                    <h2 className="text-[1.05rem] font-bold text-slate-900 dark:text-slate-100">
                        Duración promedio por técnico
                    </h2>
                    <div className="mt-3">
                        <ChartCanvas
                            id="chart-duracion"
                            factory={chartDuracion}
                            filtered={filtered}
                            height={300}
                        />
                    </div>
                </article>
                <article className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.10)] sm:p-6 dark:border-white/10 dark:bg-carbon-900">
                    <h2 className="text-[1.05rem] font-bold text-slate-900 dark:text-slate-100">
                        Distribución de duración de OTs
                    </h2>
                    <div className="mt-3">
                        <ChartCanvas
                            id="chart-dist-duracion"
                            factory={chartDistDuracion}
                            filtered={filtered}
                            height={300}
                        />
                    </div>
                </article>
            </div>

            <article className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.10)] sm:p-6 dark:border-white/10 dark:bg-carbon-900">
                <h2 className="text-[1.05rem] font-bold text-slate-900 dark:text-slate-100">
                    Detalle de tiempos por técnico
                </h2>
                <div className="mt-3">
                    <DataTable columns={columns} rows={rows} emptyLabel="Sin OTs de taller en el período" />
                </div>
            </article>
        </DashboardShell>
    );
}