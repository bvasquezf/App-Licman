import DashboardShell from "../../components/mantenimiento/DashboardShell";
import KpiCard from "../../components/mantenimiento/KpiCard";
import ChartCanvas from "../../components/mantenimiento/ChartCanvas";
import DataTable from "../../components/mantenimiento/DataTable";
import { useDashboard } from "../../context/DashboardContext";
import {
    chartEstado,
    chartMix,
    tableTecnicos,
} from "../../lib/dashboardPresentation";

/**
 * Productividad por técnico:
 *  - 2 KPI cards (técnicos activos, % operativos)
 *  - 2 charts apilados (mix de trabajo, estado final)
 *  - Tabla de productividad
 */
export default function TecnicosView() {
    const { filtered } = useDashboard();
    const rows = tableTecnicos(filtered);
    const totalTecnicos = rows.length;
    const pctOpPromedio = rows.length
        ? Math.round(
              rows.reduce((acc, r) => acc + (r.pctOp || 0), 0) / rows.length,
          )
        : 0;
    const totalOTs = rows.reduce((acc, r) => acc + r.total, 0);

    const columns = [
        { key: "nombre", header: "Técnico", render: (r) => <span className="font-medium text-slate-900">{r.nombre}</span> },
        { key: "esp", header: "Especialidad", render: (r) => r.esp || "—" },
        { key: "total", header: "Total", align: "right", render: (r) => <span className="font-mono">{r.total}</span> },
        { key: "prev", header: "Prev.", align: "right", render: (r) => <span className="font-mono text-emerald-600">{r.prev}</span> },
        { key: "corr", header: "Corr.", align: "right", render: (r) => <span className="font-mono text-amber-600">{r.corr}</span> },
        { key: "diag", header: "Diag.", align: "right", render: (r) => <span className="font-mono">{r.diag}</span> },
        {
            key: "pctOp",
            header: "% Op.",
            align: "right",
            render: (r) => {
                const v = parseInt(r.pctOpLabel);
                const cls =
                    v >= 40
                        ? "bg-emerald-100 text-emerald-700"
                        : v >= 25
                          ? "bg-amber-100 text-amber-700"
                          : "bg-rose-100 text-rose-700";
                return (
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}>
                        {r.pctOpLabel}
                    </span>
                );
            },
        },
        { key: "reincProm", header: "Reinc.", align: "right", render: (r) => <span className="font-mono">{r.reincProm}</span> },
    ];

    return (
        <DashboardShell
            title="Productividad por técnico"
            subtitle="Comparativa de actividad, tipos de trabajo y tasas de operatividad."
        >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <KpiCard title="Técnicos activos" value={totalTecnicos} sub="con al menos 1 OT" accent="blue" />
                <KpiCard title="OTs totales" value={totalOTs} sub="en el período" accent="emerald" />
                <KpiCard title="% Operativo prom." value={pctOpPromedio + "%"} sub="promedio entre técnicos" accent="amber" />
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <article className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.10)] sm:p-6">
                    <h2 className="text-[1.05rem] font-bold text-slate-900">
                        Mix de trabajo (Top 5)
                    </h2>
                    <div className="mt-3">
                        <ChartCanvas
                            id="chart-mix"
                            factory={chartMix}
                            filtered={filtered}
                            height={280}
                        />
                    </div>
                </article>
                <article className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.10)] sm:p-6">
                    <h2 className="text-[1.05rem] font-bold text-slate-900">
                        Estado final (Top 5)
                    </h2>
                    <div className="mt-3">
                        <ChartCanvas
                            id="chart-estado"
                            factory={chartEstado}
                            filtered={filtered}
                            height={280}
                        />
                    </div>
                </article>
            </div>

            <article className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.10)] sm:p-6">
                <h2 className="text-[1.05rem] font-bold text-slate-900">
                    Detalle por técnico
                </h2>
                <div className="mt-3">
                    <DataTable columns={columns} rows={rows} emptyLabel="Sin técnicos en el período" />
                </div>
            </article>
        </DashboardShell>
    );
}