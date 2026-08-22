import { useCallback } from "react";
import { useAsync } from "../../hooks/useAsync";
import { cargarHistorialTarea } from "../../lib/tareasData";

function formatearMomento(valor) {
    if (!valor) return "";
    return new Intl.DateTimeFormat("es-CL", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(valor));
}

export default function TareaHistorial({ tareaId }) {
    const cargar = useCallback(
        () => cargarHistorialTarea(tareaId),
        [tareaId],
    );
    const { data = [], loading, error, refetch } = useAsync(cargar, {
        errorContexto: "cargar el historial de la tarea",
        deps: [tareaId],
    });

    return (
        <section className="border-t border-slate-200 pt-5 dark:border-white/10">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                    Historial operativo
                </h3>
                {error && (
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="min-h-[44px] rounded-xl px-3 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
                    >
                        Reintentar
                    </button>
                )}
            </div>

            {loading && data.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500 dark:text-neutral-400">
                    Cargando historial…
                </p>
            ) : error && data.length === 0 ? (
                <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                    {error.message}
                </p>
            ) : data.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500 dark:text-neutral-400">
                    Esta tarea todavía no tiene movimientos registrados.
                </p>
            ) : (
                <ol className="mt-3 space-y-2">
                    {data.map((evento) => (
                        <li
                            key={evento.id}
                            className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.025]"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                                    {evento.evento}
                                </p>
                                <time className="text-xs font-medium text-slate-500 dark:text-neutral-400">
                                    {formatearMomento(evento.created_at)}
                                </time>
                            </div>
                            {(evento.valor_anterior || evento.valor_nuevo) && (
                                <p className="mt-1 text-xs text-slate-600 dark:text-neutral-300">
                                    {evento.valor_anterior || "Sin definir"} →{" "}
                                    {evento.valor_nuevo || "Sin definir"}
                                </p>
                            )}
                            {evento.detalle && (
                                <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700 dark:text-neutral-300">
                                    {evento.detalle}
                                </p>
                            )}
                            <p className="mt-1.5 text-xs text-slate-500 dark:text-neutral-500">
                                {evento.autor?.nombre_completo ??
                                    "Registro anterior al inicio de sesión"}
                            </p>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
