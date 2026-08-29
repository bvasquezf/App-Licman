import { useMemo } from "react";
import EmptyState from "../ui/EmptyState";
import TareasListaPaginada from "./TareasListaPaginada";
import {
    compararTareas,
    duracionTareaMinutos,
    estaTareaActiva,
    fechaLocalISO,
    formatearDuracionMinutos,
} from "../../lib/tareasData";

export default function CargaTecnicos({
    tareas,
    tecnicos,
    tecnicoFiltro,
    onEditar,
    onCambiarEstado,
    onNueva,
}) {
    const hoy = fechaLocalISO();
    const personas = useMemo(() => {
        return tecnicos
            .filter((tecnico) => tecnico.activo)
            .filter(
                (tecnico) =>
                    !tecnicoFiltro ||
                    tecnicoFiltro === "todos" ||
                    (tecnicoFiltro !== "sin_asignar" &&
                        tecnico.id === tecnicoFiltro),
            )
            .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    }, [tecnicos, tecnicoFiltro]);

    const activas = tareas.filter(estaTareaActiva);
    const tareasResumen =
        tecnicoFiltro && tecnicoFiltro !== "todos"
            ? tecnicoFiltro === "sin_asignar"
                ? activas.filter((tarea) => !tarea.tecnico_ids?.length)
                : activas.filter((tarea) =>
                      tarea.tecnico_ids?.includes(tecnicoFiltro),
                  )
            : activas;
    const minutosAgendados = tareasResumen.reduce(
        (total, tarea) => total + (duracionTareaMinutos(tarea) ?? 0),
        0,
    );
    const sinHorario = tareasResumen.filter(
        (tarea) => duracionTareaMinutos(tarea) === null,
    ).length;
    const sinAsignar = activas
        .filter((tarea) => !tarea.tecnico_ids?.length)
        .sort(compararTareas);

    if (personas.length === 0 && sinAsignar.length === 0) {
        return (
            <EmptyState
                icon="👷"
                title="Todavía no hay carga asignada"
                description="Crea una tarea y selecciona uno o más técnicos para comenzar a organizar el trabajo."
                action={onNueva ? (
                    <button
                        type="button"
                        onClick={onNueva}
                        className="min-h-[44px] rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
                    >
                        + Nueva tarea
                    </button>
                ) : null}
            />
        );
    }

    return (
        <>
            <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-500/25 dark:bg-blue-500/5">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                        ⏱ Duración de trabajos únicos
                    </p>
                    <p className="mt-1 text-2xl font-black text-blue-950 dark:text-blue-100">
                        {formatearDuracionMinutos(minutosAgendados)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-blue-800 dark:text-blue-300">
                        Cada tarea cuenta una vez, aunque tenga más de un técnico.
                    </p>
                </div>
                <div
                    className={`rounded-2xl border p-4 ${
                        sinHorario > 0
                            ? "border-amber-200 bg-amber-50/70 dark:border-amber-500/25 dark:bg-amber-500/5"
                            : "border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/25 dark:bg-emerald-500/5"
                    }`}
                >
                    <p
                        className={`text-xs font-extrabold uppercase tracking-wide ${
                            sinHorario > 0
                                ? "text-amber-700 dark:text-amber-300"
                                : "text-emerald-700 dark:text-emerald-300"
                        }`}
                    >
                        {sinHorario > 0
                            ? "⚠ Pendientes de horario"
                            : "✓ Horarios completos"}
                    </p>
                    <p
                        className={`mt-1 text-2xl font-black ${
                            sinHorario > 0
                                ? "text-amber-950 dark:text-amber-100"
                                : "text-emerald-950 dark:text-emerald-100"
                        }`}
                    >
                        {sinHorario}
                    </p>
                    <p
                        className={`mt-1 text-xs font-semibold ${
                            sinHorario > 0
                                ? "text-amber-800 dark:text-amber-300"
                                : "text-emerald-800 dark:text-emerald-300"
                        }`}
                    >
                        tareas activas sin bloque horario completo.
                    </p>
                </div>
            </section>
            <div className="grid items-start gap-4 lg:grid-cols-2">
            {personas.map((tecnico) => {
                const asignadas = activas
                    .filter((tarea) =>
                        tarea.tecnico_ids?.includes(tecnico.id),
                    )
                    .sort((a, b) => {
                        if (a.estado !== b.estado) {
                            if (a.estado === "En proceso") return -1;
                            if (b.estado === "En proceso") return 1;
                            if (a.estado === "En espera") return -1;
                            if (b.estado === "En espera") return 1;
                        }
                        return compararTareas(a, b);
                    });
                const enProceso = asignadas.filter(
                    (tarea) => tarea.estado === "En proceso",
                ).length;
                const programadasHoy = asignadas.filter(
                    (tarea) => tarea.fecha_programada === hoy,
                ).length;
                const enEspera = asignadas.filter(
                    (tarea) => tarea.estado === "En espera",
                ).length;
                const minutosTecnico = asignadas.reduce(
                    (total, tarea) =>
                        total + (duracionTareaMinutos(tarea) ?? 0),
                    0,
                );
                const sinHorarioTecnico = asignadas.filter(
                    (tarea) => duracionTareaMinutos(tarea) === null,
                ).length;
                const estado =
                    enProceso > 0
                        ? {
                              texto: "Trabajando ahora",
                              clase: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
                          }
                        : enEspera > 0
                          ? {
                                texto: `${enEspera} en espera`,
                                clase: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
                            }
                        : programadasHoy > 0
                          ? {
                                texto: `${programadasHoy} programada${programadasHoy === 1 ? "" : "s"} hoy`,
                                clase: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
                            }
                          : {
                                texto: "Disponible hoy",
                                clase: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
                            };

                return (
                    <section
                        key={tecnico.id}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 dark:border-white/10 dark:bg-white/[0.025]"
                    >
                        <header className="border-b border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-carbon-900">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-lg font-black text-white dark:bg-white dark:text-carbon-900">
                                        {tecnico.nombre
                                            .trim()
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="truncate text-base font-extrabold text-slate-900 dark:text-slate-100">
                                            {tecnico.nombre}
                                        </h2>
                                        <p className="text-xs text-slate-500 dark:text-neutral-400">
                                            {tecnico.cargo
                                                ? `${tecnico.cargo} · `
                                                : ""}
                                            {asignadas.length} tarea
                                            {asignadas.length === 1 ? "" : "s"} activa
                                            {asignadas.length === 1 ? "" : "s"}
                                        </p>
                                        <p className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                                            ⏱ Carga asignada: {formatearDuracionMinutos(minutosTecnico)}
                                            {sinHorarioTecnico > 0
                                                ? ` · ${sinHorarioTecnico} sin horario`
                                                : ""}
                                        </p>
                                    </div>
                                </div>
                                <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${estado.clase}`}
                                >
                                    {estado.texto}
                                </span>
                            </div>
                        </header>
                        <div className="space-y-3 p-3">
                            <TareasListaPaginada
                                tareas={asignadas}
                                onEditar={onEditar}
                                onCambiarEstado={onCambiarEstado}
                                compacta
                                limiteInicial={6}
                                incremento={6}
                                className="space-y-3"
                            />
                            {asignadas.length === 0 && (
                                <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 p-5 text-center dark:border-emerald-500/30 dark:bg-emerald-500/5">
                                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                                        Sin trabajos pendientes
                                    </p>
                                    {onNueva && (
                                        <button
                                            type="button"
                                            onClick={onNueva}
                                            className="mt-2 min-h-[44px] rounded-xl px-3 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
                                        >
                                            + Asignar tarea
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>
                );
            })}

            {(!tecnicoFiltro ||
                tecnicoFiltro === "todos" ||
                tecnicoFiltro === "sin_asignar") &&
                sinAsignar.length > 0 && (
                    <section className="overflow-hidden rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/5">
                        <header className="border-b border-amber-200 p-4 dark:border-amber-500/20">
                            <h2 className="text-base font-extrabold text-amber-900 dark:text-amber-200">
                                ⚠ Sin técnico asignado
                            </h2>
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                                Estas solicitudes todavía necesitan responsable.
                            </p>
                        </header>
                        <div className="space-y-3 p-3">
                            <TareasListaPaginada
                                tareas={sinAsignar}
                                onEditar={onEditar}
                                onCambiarEstado={onCambiarEstado}
                                compacta
                                limiteInicial={6}
                                incremento={6}
                                className="space-y-3"
                            />
                        </div>
                    </section>
                )}
            </div>
        </>
    );
}
