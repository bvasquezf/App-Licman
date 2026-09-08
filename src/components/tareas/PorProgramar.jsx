import EmptyState from "../ui/EmptyState";
import TareasListaPaginada from "./TareasListaPaginada";
import {
    CATEGORIAS_REQUERIMIENTO,
    compararTareas,
    estaTareaActiva,
} from "../../lib/tareasData";

function Grupo({ titulo, descripcion, tono, tareas, onEditar, onCambiarEstado }) {
    if (tareas.length === 0) return null;
    const tonos = {
        rose: "border-rose-200 bg-rose-50/45 dark:border-rose-500/25 dark:bg-rose-500/5",
        amber: "border-amber-200 bg-amber-50/45 dark:border-amber-500/25 dark:bg-amber-500/5",
    };

    return (
        <section
            className={`rounded-2xl border p-4 sm:p-5 ${tonos[tono] ?? tonos.amber}`}
        >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h2 className="text-lg font-black text-slate-950 dark:text-white">
                        {titulo}
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-neutral-400">
                        {descripcion}
                    </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-200">
                    {tareas.length}
                </span>
            </div>
            <TareasListaPaginada
                tareas={tareas}
                onEditar={onEditar}
                onCambiarEstado={onCambiarEstado}
            />
        </section>
    );
}

export default function PorProgramar({
    tareas,
    onEditar,
    onCambiarEstado,
    onNueva,
}) {
    const pendientes = tareas
        .filter(
            (tarea) =>
                estaTareaActiva(tarea) &&
                (tarea.estado === "Por programar" ||
                    !tarea.fecha_programada ||
                    !tarea.tecnico_ids?.length),
        )
        .sort(compararTareas);
    const nuevas = pendientes.filter(
        (tarea) => !tarea.fecha_programada && !tarea.tecnico_ids?.length,
    );
    const incompletas = pendientes.filter(
        (tarea) => tarea.fecha_programada || tarea.tecnico_ids?.length,
    );

    return (
        <div className="space-y-5">
            <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-500/25 dark:bg-blue-500/5 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-black text-blue-950 dark:text-blue-200">
                            Bandeja de requerimientos
                        </h2>
                        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-blue-800 dark:text-blue-300">
                            Registra cada pedido apenas llegue. Si aún no tiene
                            fecha o técnico, permanecerá visible aquí con su alerta
                            pendiente hasta completar la planificación.
                        </p>
                    </div>
                    {onNueva && (
                        <button
                            type="button"
                            onClick={() => onNueva()}
                            className="min-h-[48px] shrink-0 rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white hover:bg-blue-700"
                        >
                            + Nuevo requerimiento
                        </button>
                    )}
                </div>
            </section>

            {onNueva && (
                <section>
                    <div className="mb-3">
                        <h2 className="text-lg font-black text-slate-950 dark:text-white">
                            ¿Qué necesitas registrar?
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-neutral-400">
                            Elige una opción para abrir el formulario preparado.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {CATEGORIAS_REQUERIMIENTO.map((categoria) => (
                            <button
                                key={categoria.valor}
                                type="button"
                                onClick={() =>
                                    onNueva({
                                        categoria_requerimiento: categoria.valor,
                                        tipo: categoria.tipoSugerido,
                                    })
                                }
                                className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_6px_20px_rgba(15,23,42,0.04)] transition hover:border-blue-400 hover:bg-blue-50 dark:border-white/10 dark:bg-carbon-900 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10"
                            >
                                <span className="text-2xl" aria-hidden="true">
                                    {categoria.icono}
                                </span>
                                <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                                    {categoria.etiqueta}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {pendientes.length === 0 && (
                <EmptyState
                    icon="🎯"
                    title="Todo está programado"
                    description="No quedan requerimientos sin fecha o sin técnico asignado. Puedes registrar el siguiente desde las opciones de arriba."
                />
            )}

            <Grupo
                titulo="Requerimientos nuevos"
                descripcion="Todavía no tienen fecha ni técnico. Prioriza primero las urgentes."
                tono="rose"
                tareas={nuevas}
                onEditar={onEditar}
                onCambiarEstado={onCambiarEstado}
            />
            <Grupo
                titulo="Planificación incompleta"
                descripcion="Ya tienen parte de la información, pero falta fecha o responsable."
                tono="amber"
                tareas={incompletas}
                onEditar={onEditar}
                onCambiarEstado={onCambiarEstado}
            />
        </div>
    );
}
