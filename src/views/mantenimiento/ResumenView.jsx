import DashboardShell from "../../components/mantenimiento/DashboardShell";
import KpiCard from "../../components/mantenimiento/KpiCard";
import ChartCanvas from "../../components/mantenimiento/ChartCanvas";
import { useDashboard } from "../../context/DashboardContext";
import {
    chartClientes,
    chartFallas,
    chartMensual,
    chartTecnicos,
    chartTipo,
} from "../../lib/dashboardPresentation";

/**
 * Resumen ejecutivo:
 *  - 5 KPI cards principales
 *  - Distribución tipo de trabajo (doughnut)
 *  - Actividad por técnico (bar h)
 *  - Tendencia mensual (line)
 *  - Tipos de falla (bar v)
 *  - Top 8 clientes (bar v)
 */
export default function ResumenView() {
    const { filtered, kpis } = useDashboard();

    return (
        <DashboardShell
            title="Resumen ejecutivo"
            subtitle="Visión consolidada de la actividad técnica del último período."
        >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <KpiCard
                    title="Total OTs"
                    value={kpis.resumen.total}
                    sub={kpis.resumen.totalSub}
                    accent="blue"
                />
                <KpiCard
                    title="Preventivas"
                    value={kpis.resumen.preventivasPct}
                    sub={kpis.resumen.preventivasSub}
                    accent="emerald"
                />
                <KpiCard
                    title="Correctivas"
                    value={kpis.resumen.correctivasPct}
                    sub={kpis.resumen.correctivasSub}
                    accent="amber"
                />
                <KpiCard
                    title="Reincidencia prom."
                    value={kpis.resumen.reincPromedio}
                    sub="visitas por equipo"
                    accent="rose"
                />
                <KpiCard
                    title="Equipos críticos"
                    value={kpis.resumen.equiposCriticos}
                    sub="Reincidencia ≥ 4"
                    accent="slate"
                />
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <ChartCard title="Distribución tipo de trabajo">
                    <ChartCanvas
                        id="chart-tipo"
                        factory={chartTipo}
                        filtered={filtered}
                        height={280}
                    />
                </ChartCard>
                <ChartCard title="Actividad por técnico">
                    <ChartCanvas
                        id="chart-tecnicos"
                        factory={chartTecnicos}
                        filtered={filtered}
                        height={280}
                    />
                </ChartCard>
                <ChartCard
                    title="Tendencia mensual"
                    className="lg:col-span-2"
                >
                    <ChartCanvas
                        id="chart-mensual"
                        factory={chartMensual}
                        filtered={filtered}
                        height={300}
                    />
                </ChartCard>
                <ChartCard title="Tipos de falla más frecuentes">
                    <ChartCanvas
                        id="chart-fallas"
                        factory={chartFallas}
                        filtered={filtered}
                        height={280}
                    />
                </ChartCard>
                <ChartCard title="Top 8 clientes (terreno)">
                    <ChartCanvas
                        id="chart-clientes"
                        factory={chartClientes}
                        filtered={filtered}
                        height={280}
                    />
                </ChartCard>
            </div>
        </DashboardShell>
    );
}

function ChartCard({ title, children, className = "" }) {
    return (
        <article
            className={`rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.10)] sm:p-6 ${className}`}
        >
            <h2 className="text-[1.05rem] font-bold text-slate-900">{title}</h2>
            <div className="mt-3">{children}</div>
        </article>
    );
}