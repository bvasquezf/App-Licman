import EmptyState from "../ui/EmptyState";
import TareaCard from "./TareaCard";
import {
    compararTareas,
    estaTareaActiva,
    fechaLocalISO,
    formatearFechaTarea,
} from "../../lib/tareasData";

function ListaAgenda({ tareas, onEditar, onCambiarEstado }) {
    return (
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
    );
}

export default function AgendaHoy({
    tareas,
    onEditar,
    onCambiarEstado,
    onNueva,
}) {
    const hoy = fechaLocalISO();
    const mananaFecha = new Date();
    mananaFecha.setDate(mananaFecha.getDate() + 1);
    const manana = fechaLocalISO(mananaFecha);
    const limiteFecha = new Date();
    limiteFecha.setDate(limiteFecha.getDate() + 7);
    const limite = fechaLocalISO(limiteFecha);

    const activas = tareas.filter(estaTareaActiva);
    const atrasadas = activas
        .filter(
            (tarea) =>
                tarea.fecha_programada && tarea.fecha_programada < hoy,
        )
        .sort(compararTareas);
    const delDia = tareas
        .filter(
            (tarea) =>
                tarea.fecha_programada === hoy && tarea.estado !== "Cancelada",
        )
        .sort(compararTareas);
    const proximas = activas
        .filter(
            (tarea) =>
                tarea.fecha_programada >= manana &&
                tarea.fecha_programada <= limite,
        )
        .sort(compararTareas)
        .slice(0, 9);
    const porProgramar = activas.filter(
        (tarea) =>
            tarea.estado === "Por programar" ||
            !tarea.fecha_programada ||
            !tarea.tecnicos?.length,
    ).length;
    const enProceso = delDia.filter(
        (tarea) => tarea.estado === "En proceso",
    ).length;
    const terminadas = delDia.filter(
        (tarea) => tarea.estado === "Finalizada",
    ).length;

    const tituloFecha = new Intl.DateTimeFormat("es-CL", {
        weekday: "long",
        day: "numeric",
        month: "long",
    }).format(new Date(`${hoy}T12:00:00`));

    return (
        <div className="space-y-5">
            <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white shadow-[0_18px_50px_rgba(15,23,42,0.22)]">
                <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-300">
                                Operación diaria
                            </p>
                            <h2 className="mt-1 text-2xl font-black capitalize sm:text-3xl">
                                {tituloFecha}
                            </h2>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                                Revisa atrasos, coordina las visitas de hoy y deja
                                cada trabajo con un responsable claro.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            <button
                                type="button"
                                onClick={() =>
                                    onNueva({ fecha_programada: hoy })
                                }
                                className="min-h-[48px] rounded-xl bg-white px-4 text-sm font-extrabold text-slate-950 hover:bg-blue-50"
                            >
                                + Trabajo hoy
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    onNueva({
                                        fecha_programada: hoy,
                                        tipo: "Terreno",
                                    })
                                }
                                className="min-h-[48px] rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-extrabold text-white hover:bg-white/15"
                            >
                                🚐 Nueva visita
                            </button>
                            <button
                                type="button"
                                onClick={() => onNueva()}
                                className="col-span-2 min-h-[48px] rounded-xl border border-white/20 px-4 text-sm font-bold text-slate-200 hover:bg-white/10 sm:col-span-1"
                            >
                                + Por programar
                            </button>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                            ["Hoy", delDia.length],
                            ["En proceso", enProceso],
                            ["Terminadas", terminadas],
                            ["Por programar", porProgramar],
                        ].map(([etiqueta, valor]) => (
                            <div
                                key={etiqueta}
                                className="rounded-2xl border border-white/10 bg-white/[0.07] p-3"
                            >
                                <p className="text-2xl font-black">{valor}</p>
                                <p className="text-xs font-semibold text-slate-300">
                                    {etiqueta}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {atrasadas.length > 0 && (
                <section className="rounded-2xl border-2 border-rose-200 bg-rose-50/50 p-4 dark:border-rose-500/25 dark:bg-rose-500/5 sm:p-5">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <h2 className="text-lg font-black text-rose-900 dark:text-rose-200">
                                ⚠ Trabajos atrasados
                            </h2>
                            <p className="mt-0.5 text-sm text-rose-700 dark:text-rose-300">
                                Reprograma o resuelve estos {atrasadas.length}{" "}
                                trabajo{atrasadas.length === 1 ? "" : "s"} antes
                                de cerrar la jornada.
                            </p>
                        </div>
                    </div>
                    <ListaAgenda
                        tareas={atrasadas}
                        onEditar={onEditar}
                        onCambiarEstado={onCambiarEstado}
                    />
                </section>
            )}

            <section>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                    <div>
                        <h2 className="text-lg font-black text-slate-950 dark:text-white">
                            Agenda de hoy
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-neutral-400">
                            Ordenada por hora de inicio y prioridad.
                        </p>
                    </div>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold text-blue-800 dark:bg-blue-500/15 dark:text-blue-300">
                        {delDia.length} trabajo{delDia.length === 1 ? "" : "s"}
                    </span>
                </div>
                {delDia.length > 0 ? (
                    <ListaAgenda
                        tareas={delDia}
                        onEditar={onEditar}
                        onCambiarEstado={onCambiarEstado}
                    />
                ) : (
                    <EmptyState
                        icon="☀️"
                        title="No hay trabajos agendados para hoy"
                        description="Puedes registrar una visita para hoy o dejar una solicitud en la bandeja por programar."
                        action={
                            <button
                                type="button"
                                onClick={() =>
                                    onNueva({ fecha_programada: hoy })
                                }
                                className="min-h-[44px] rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
                            >
                                + Agendar trabajo hoy
                            </button>
                        }
                    />
                )}
            </section>

            {proximas.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.025] sm:p-5">
                    <div className="mb-3">
                        <h2 className="text-lg font-black text-slate-950 dark:text-white">
                            Próximos 7 días
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-neutral-400">
                            Desde {formatearFechaTarea(manana)} hasta {" "}
                            {formatearFechaTarea(limite)}.
                        </p>
                    </div>
                    <ListaAgenda
                        tareas={proximas}
                        onEditar={onEditar}
                        onCambiarEstado={onCambiarEstado}
                    />
                </section>
            )}
        </div>
    );
}
