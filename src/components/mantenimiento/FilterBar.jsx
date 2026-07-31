import { useDashboard } from "../../context/DashboardContext";

/**
 * Barra de filtros (sticky) + badge de estado de la fuente.
 */
export default function FilterBar() {
    const {
        filters,
        setFilter,
        clearFilters,
        rawData,
        filtered,
        lastUpdate,
        dataSource,
        refresh,
        loading,
        circuitState,
        filterOptions,
        fuentes,
    } = useDashboard();

    const fuenteLabel = dataSource === "live" ? "Datos en vivo" : dataSource === "fallback" ? "Datos locales (fallback)" : "Sin datos";

    return (
        <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur sm:-mx-6 sm:px-6 dark:border-white/10 dark:bg-carbon-950/90">
            <div className="flex flex-wrap items-center gap-2">
                <select
                    value={filters.tecnico}
                    onChange={(e) => setFilter("tecnico", e.target.value)}
                    className="min-w-0 flex-1 rounded-[10px] border-[1.5px] border-slate-300 bg-white px-3 py-2 text-[0.88rem] font-medium text-slate-900 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100 outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15"
                    aria-label="Filtrar por técnico"
                >
                    <option value="">Todos los técnicos</option>
                    {filterOptions.tecnicos.map((t) => (
                        <option key={t} value={t}>
                            {t}
                        </option>
                    ))}
                </select>
                <select
                    value={filters.cliente}
                    onChange={(e) => setFilter("cliente", e.target.value)}
                    className="min-w-0 flex-1 rounded-[10px] border-[1.5px] border-slate-300 bg-white px-3 py-2 text-[0.88rem] font-medium text-slate-900 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100 outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15"
                    aria-label="Filtrar por cliente"
                >
                    <option value="">Todos los clientes</option>
                    {filterOptions.clientes.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
                <select
                    value={filters.fuente}
                    onChange={(e) => setFilter("fuente", e.target.value)}
                    className="min-w-0 flex-1 rounded-[10px] border-[1.5px] border-slate-300 bg-white px-3 py-2 text-[0.88rem] font-medium text-slate-900 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100 outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15"
                    aria-label="Filtrar por fuente"
                >
                    <option value="">Todas las fuentes</option>
                    {fuentes.map((f) => (
                        <option key={f} value={f}>
                            {f}
                        </option>
                    ))}
                </select>
                <select
                    value={filters.periodo}
                    onChange={(e) => setFilter("periodo", e.target.value)}
                    className="min-w-0 flex-1 rounded-[10px] border-[1.5px] border-slate-300 bg-white px-3 py-2 text-[0.88rem] font-medium text-slate-900 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100 outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15"
                    aria-label="Filtrar por período"
                >
                    <option value="">Todos los períodos</option>
                    {filterOptions.periodos.map((p) => (
                        <option key={p} value={p}>
                            {p}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-[0.85rem] font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200 dark:hover:bg-white/10"
                >
                    Limpiar
                </button>
                <button
                    type="button"
                    onClick={() => refresh(true, { manual: true })}
                    disabled={loading}
                    className="flex items-center gap-1.5 rounded-[10px] bg-blue-600 px-3 py-2 text-[0.85rem] font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                    title="Actualizar datos"
                >
                    <span
                        className={loading ? "animate-spin" : ""}
                        aria-hidden
                    >
                        ↻
                    </span>
                    <span>{loading ? "Cargando…" : "Actualizar"}</span>
                </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.78rem]">
                <span
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold ${
                        circuitState.isOpen
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400"
                            : dataSource === "live"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : dataSource === "fallback"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400"
                                : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-neutral-400"
                    }`}
                >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {fuenteLabel}
                </span>
                <span className="text-slate-600 dark:text-neutral-400">
                    Mostrando{" "}
                    <strong className="font-bold text-slate-900 tabular-nums dark:text-slate-100">
                        {filtered.length}
                    </strong>{" "}
                    de{" "}
                    <strong className="font-bold text-slate-900 tabular-nums dark:text-slate-100">
                        {rawData.length}
                    </strong>{" "}
                    registros
                </span>
                {lastUpdate && (
                    <span className="text-slate-500 dark:text-neutral-400">
                        · actualizado{" "}
                        {lastUpdate.toLocaleTimeString("es-CL", {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </span>
                )}
            </div>
        </div>
    );
}