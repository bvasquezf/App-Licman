import { useState } from "react";
import EmptyState from "../ui/EmptyState";
import { formatearFechaTarea } from "../../lib/tareasData";

function formatearMomento(valor) {
    if (!valor) return "";
    return new Intl.DateTimeFormat("es-CL", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(valor));
}

export default function TareasEliminadas({ tareas, onRestaurar }) {
    const [limite, setLimite] = useState(18);
    const visibles = tareas.slice(0, limite);
    const restantes = Math.max(0, tareas.length - visibles.length);

    if (tareas.length === 0) {
        return (
            <EmptyState
                icon="🗑️"
                title="La papelera está vacía"
                description="Las tareas eliminadas aparecerán aquí y podrás restaurarlas sin perder su historial."
            />
        );
    }

    return (
        <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.025] sm:p-5">
                <h2 className="text-lg font-black text-slate-950 dark:text-white">
                    Papelera de tareas
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-neutral-400">
                    Las tareas no se borran definitivamente: conservan técnicos,
                    resultado e historial para evitar pérdidas accidentales.
                </p>
            </section>

            <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibles.map((tarea) => (
                    <article
                        key={tarea.id}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-carbon-900"
                    >
                        <div className="p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-neutral-300">
                                        Antes: {tarea.estado_antes_eliminar ?? "Sin definir"}
                                    </span>
                                    <h3 className="mt-2 text-base font-extrabold leading-snug text-slate-900 dark:text-slate-100">
                                        {tarea.titulo}
                                    </h3>
                                </div>
                                <span className="shrink-0 font-mono text-xs font-semibold text-slate-400">
                                    #{String(tarea.id).padStart(4, "0")}
                                </span>
                            </div>

                            <div className="mt-3 space-y-1.5 text-xs font-medium text-slate-600 dark:text-neutral-300">
                                <p>
                                    🗑 {formatearMomento(tarea.eliminada_at)}
                                </p>
                                <p>
                                    👤 {tarea.eliminador?.nombre_completo ?? "Usuario no disponible"}
                                </p>
                                <p>
                                    📅 {formatearFechaTarea(tarea.fecha_programada)}
                                </p>
                                {tarea.tecnicos?.length > 0 && (
                                    <p className="truncate">
                                        👷 {tarea.tecnicos.join(", ")}
                                    </p>
                                )}
                                {tarea.cliente_nombre && (
                                    <p className="truncate">
                                        🏢 {tarea.cliente_nombre}
                                    </p>
                                )}
                            </div>

                            {tarea.motivo_eliminacion && (
                                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-white/5 dark:text-neutral-300">
                                    {tarea.motivo_eliminacion}
                                </p>
                            )}
                        </div>

                        <div className="border-t border-slate-100 p-2.5 dark:border-white/5">
                            <button
                                type="button"
                                onClick={() => onRestaurar(tarea)}
                                className="min-h-[44px] w-full rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white hover:bg-blue-700"
                            >
                                ↩ Restaurar tarea
                            </button>
                        </div>
                    </article>
                ))}
            </div>
            {restantes > 0 && (
                <div className="flex justify-center">
                    <button
                        type="button"
                        onClick={() => setLimite((actual) => actual + 18)}
                        className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-extrabold text-blue-700 hover:bg-blue-50 dark:border-white/15 dark:bg-carbon-900 dark:text-blue-300 dark:hover:bg-white/5"
                    >
                        Mostrar {Math.min(18, restantes)} más ({restantes} pendientes)
                    </button>
                </div>
            )}
        </div>
    );
}
