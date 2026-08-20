import EmptyState from "../ui/EmptyState";
import TareaCard from "./TareaCard";

const COLUMNAS = [
    {
        estado: "Pendiente",
        titulo: "Pendientes",
        descripcion: "Asignadas o programadas para más adelante",
        icono: "🕓",
        borde: "border-amber-300 dark:border-amber-500/30",
    },
    {
        estado: "En proceso",
        titulo: "En proceso",
        descripcion: "Trabajos que se están realizando ahora",
        icono: "🛠️",
        borde: "border-blue-300 dark:border-blue-500/30",
    },
    {
        estado: "Finalizada",
        titulo: "Finalizadas recientes",
        descripcion: "Últimos trabajos terminados",
        icono: "✅",
        borde: "border-emerald-300 dark:border-emerald-500/30",
    },
];

export default function TareasTablero({
    tareas,
    onEditar,
    onCambiarEstado,
    onNueva,
}) {
    return (
        <div className="grid items-start gap-4 lg:grid-cols-3">
            {COLUMNAS.map((columna) => {
                const tareasColumna = tareas
                    .filter((tarea) => tarea.estado === columna.estado)
                    .slice(0, columna.estado === "Finalizada" ? 8 : undefined);
                return (
                    <section
                        key={columna.estado}
                        className={`rounded-2xl border-t-4 bg-slate-50/70 p-3 dark:bg-white/[0.025] ${columna.borde}`}
                    >
                        <header className="mb-3 px-1 pt-1">
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                                    {columna.icono} {columna.titulo}
                                </h2>
                                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold tabular-nums text-slate-700 shadow-sm dark:bg-carbon-800 dark:text-slate-200">
                                    {tareasColumna.length}
                                </span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                                {columna.descripcion}
                            </p>
                        </header>

                        <div className="space-y-3">
                            {tareasColumna.map((tarea) => (
                                <TareaCard
                                    key={tarea.id}
                                    tarea={tarea}
                                    onEditar={onEditar}
                                    onCambiarEstado={onCambiarEstado}
                                />
                            ))}
                            {tareasColumna.length === 0 && (
                                <EmptyState
                                    icon={columna.icono}
                                    title={`Sin tareas ${columna.titulo.toLowerCase()}`}
                                    description={
                                        columna.estado === "Pendiente"
                                            ? "Las nuevas solicitudes aparecerán aquí."
                                            : "No hay trabajos en este estado con los filtros actuales."
                                    }
                                    action={
                                        columna.estado === "Pendiente" ? (
                                            <button
                                                type="button"
                                                onClick={onNueva}
                                                className="min-h-[44px] rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
                                            >
                                                + Nueva tarea
                                            </button>
                                        ) : null
                                    }
                                />
                            )}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
