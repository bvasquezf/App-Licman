import EmptyState from "../ui/EmptyState";
import TareaCard from "./TareaCard";
import {
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
            <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
                {tareas.map((tarea) => (
                    <TareaCard
                        key={tarea.id}
                        tarea={tarea}
                        onEditar={onEditar}
                        onCambiarEstado={onCambiarEstado}
                    />
                ))}
            </div>
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
                    !tarea.tecnicos?.length),
        )
        .sort(compararTareas);
    const nuevas = pendientes.filter(
        (tarea) => !tarea.fecha_programada && !tarea.tecnicos?.length,
    );
    const incompletas = pendientes.filter(
        (tarea) => tarea.fecha_programada || tarea.tecnicos?.length,
    );

    if (pendientes.length === 0) {
        return (
            <EmptyState
                icon="🎯"
                title="Todo está programado"
                description="No quedan solicitudes sin fecha o sin técnico asignado."
                action={
                    <button
                        type="button"
                        onClick={onNueva}
                        className="min-h-[44px] rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
                    >
                        + Registrar solicitud
                    </button>
                }
            />
        );
    }

    return (
        <div className="space-y-5">
            <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-500/25 dark:bg-blue-500/5 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-black text-blue-950 dark:text-blue-200">
                            Bandeja de planificación
                        </h2>
                        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-blue-800 dark:text-blue-300">
                            Estas solicitudes todavía necesitan fecha, horario o
                            responsable. Abre una tarjeta, completa la planificación
                            y quedará automáticamente como Programada.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onNueva}
                        className="min-h-[48px] shrink-0 rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white hover:bg-blue-700"
                    >
                        + Nueva solicitud
                    </button>
                </div>
            </section>

            <Grupo
                titulo="Solicitudes nuevas"
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
