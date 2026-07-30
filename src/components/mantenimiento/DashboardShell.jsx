import FilterBar from "./FilterBar";
import { useDashboard } from "../../context/DashboardContext";

/**
 * Wrapper para las 4 vistas del dashboard.
 * Inyecta FilterBar (sticky) y maneja empty / loading / error state.
 */
export default function DashboardShell({ title, subtitle, children }) {
    const { filtered, rawData, loading, loadError } = useDashboard();

    const sinDatos = rawData.length === 0;
    const sinCoincidencias = !sinDatos && filtered.length === 0;

    return (
        <section className="space-y-4">
            <header>
                <h1 className="text-[1.35rem] font-bold text-slate-900">{title}</h1>
                {subtitle && (
                    <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
                )}
            </header>

            <FilterBar />

            {loading && rawData.length === 0 && (
                <div className="rounded-[14px] border border-slate-200 bg-white p-8 text-center shadow-[0_10px_30px_rgba(15,23,42,0.10)]">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
                    <p className="mt-3 text-sm font-medium text-slate-600">
                        Cargando datos del servidor…
                    </p>
                </div>
            )}

            {!loading && loadError && sinDatos && (
                <div className="rounded-[14px] border-l-4 border-rose-600 bg-rose-50 p-5 text-rose-900 shadow-sm">
                    <p className="text-base font-bold">⚠ No se pudieron cargar datos</p>
                    <p className="mt-1 text-sm">{loadError}</p>
                    <p className="mt-2 text-xs">
                        Revisa tu conexión a internet y presiona Actualizar
                        para reintentar.
                    </p>
                </div>
            )}

            {sinCoincidencias && (
                <div className="rounded-[14px] border-2 border-dashed border-slate-300 bg-white p-8 text-center">
                    <div className="text-3xl">🔍</div>
                    <p className="mt-2 text-base font-bold text-slate-900">
                        Sin resultados para los filtros aplicados
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                        Prueba a limpiar los filtros.
                    </p>
                </div>
            )}

            {!sinDatos && !sinCoincidencias && children}
        </section>
    );
}