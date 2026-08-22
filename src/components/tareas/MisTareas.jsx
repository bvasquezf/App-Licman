import { useState } from "react";
import EmptyState from "../ui/EmptyState";
import TareaCard from "./TareaCard";
import {
    compararTareas,
    estaTareaActiva,
    fechaLocalISO,
    tecnicosDeMiPerfil,
} from "../../lib/tareasData";

function Lista({ tareas, onEditar, onCambiarEstado }) {
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

export default function MisTareas({
    tareas,
    tecnicos,
    perfil,
    onEditar,
    onCambiarEstado,
    onVincular,
}) {
    const hoy = fechaLocalISO();
    const misNombres = tecnicosDeMiPerfil(tecnicos, perfil);
    const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState("");
    const [vinculando, setVinculando] = useState(false);

    if (misNombres.length === 0) {
        const disponibles = tecnicos.filter(
            (tecnico) => tecnico.activo && !tecnico.perfil_id,
        );
        return (
            <div className="mx-auto max-w-2xl">
                <EmptyState
                    icon="🪪"
                    title="Vincula tu cuenta con tu nombre de técnico"
                    description={`Tu perfil figura como “${perfil?.nombre_completo ?? "Sin nombre"}”. Selecciona una identidad disponible para recibir aquí tus asignaciones.`}
                    action={
                        disponibles.length > 0 ? (
                            <div className="grid w-full max-w-md gap-2 sm:grid-cols-[1fr_auto]">
                                <select
                                    value={tecnicoSeleccionado}
                                    onChange={(event) =>
                                        setTecnicoSeleccionado(
                                            event.target.value,
                                        )
                                    }
                                    className="min-h-[48px] rounded-xl border-[1.5px] border-slate-300 bg-white px-3 text-base font-semibold text-slate-800 outline-none focus:border-blue-600 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100"
                                    aria-label="Seleccionar mi nombre de técnico"
                                >
                                    <option value="">
                                        Selecciona tu nombre
                                    </option>
                                    {disponibles.map((tecnico) => (
                                        <option
                                            key={tecnico.nombre}
                                            value={tecnico.nombre}
                                        >
                                            {tecnico.nombre}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    disabled={
                                        !tecnicoSeleccionado || vinculando
                                    }
                                    onClick={async () => {
                                        setVinculando(true);
                                        try {
                                            await onVincular(
                                                tecnicoSeleccionado,
                                            );
                                        } finally {
                                            setVinculando(false);
                                        }
                                    }}
                                    className="min-h-[48px] rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {vinculando
                                        ? "Vinculando…"
                                        : "Vincular cuenta"}
                                </button>
                            </div>
                        ) : null
                    }
                />
                {disponibles.length === 0 && (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
                        No quedan técnicos disponibles. Un administrador debe
                        revisar las vinculaciones existentes.
                    </p>
                )}
            </div>
        );
    }

    const asignadas = tareas
        .filter(
            (tarea) =>
                tarea.tecnicos?.some((nombre) => misNombres.includes(nombre)) &&
                tarea.estado !== "Cancelada",
        )
        .sort(compararTareas);
    const activas = asignadas.filter(estaTareaActiva);
    const atrasadas = activas.filter(
        (tarea) =>
            tarea.fecha_programada && tarea.fecha_programada < hoy,
    );
    const deHoy = asignadas.filter(
        (tarea) => tarea.fecha_programada === hoy,
    );
    const proximas = activas
        .filter(
            (tarea) =>
                tarea.fecha_programada && tarea.fecha_programada > hoy,
        )
        .slice(0, 12);
    const sinFecha = activas.filter((tarea) => !tarea.fecha_programada);

    return (
        <div className="space-y-5">
            <section className="rounded-3xl bg-gradient-to-br from-blue-700 to-blue-950 p-5 text-white shadow-[0_16px_45px_rgba(30,64,175,0.22)] sm:p-6">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-200">
                    Mi jornada
                </p>
                <h2 className="mt-1 text-2xl font-black">
                    Hola, {perfil?.nombre_completo?.split(" ")[0] ?? "técnico"}
                </h2>
                <p className="mt-2 text-sm text-blue-100">
                    Asignación: {misNombres.join(", ")}. Desde aquí puedes iniciar,
                    pausar y cerrar tus trabajos.
                </p>
                <div className="mt-5 grid grid-cols-3 gap-2">
                    {[
                        ["Hoy", deHoy.length],
                        ["Atrasadas", atrasadas.length],
                        ["Próximas", proximas.length],
                    ].map(([etiqueta, valor]) => (
                        <div
                            key={etiqueta}
                            className="rounded-2xl border border-white/15 bg-white/10 p-3 text-center"
                        >
                            <p className="text-2xl font-black">{valor}</p>
                            <p className="text-xs font-semibold text-blue-100">
                                {etiqueta}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {atrasadas.length > 0 && (
                <section className="rounded-2xl border-2 border-rose-200 bg-rose-50/50 p-4 dark:border-rose-500/25 dark:bg-rose-500/5 sm:p-5">
                    <h2 className="mb-3 text-lg font-black text-rose-900 dark:text-rose-200">
                        ⚠ Mis trabajos atrasados
                    </h2>
                    <Lista
                        tareas={atrasadas}
                        onEditar={onEditar}
                        onCambiarEstado={onCambiarEstado}
                    />
                </section>
            )}

            <section>
                <div className="mb-3">
                    <h2 className="text-lg font-black text-slate-950 dark:text-white">
                        Mis trabajos de hoy
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-neutral-400">
                        Revisa el contacto y la ubicación antes de salir.
                    </p>
                </div>
                {deHoy.length > 0 ? (
                    <Lista
                        tareas={deHoy}
                        onEditar={onEditar}
                        onCambiarEstado={onCambiarEstado}
                    />
                ) : (
                    <EmptyState
                        icon="☕"
                        title="No tienes trabajos asignados para hoy"
                        description="Las próximas asignaciones aparecerán más abajo."
                    />
                )}
            </section>

            {sinFecha.length > 0 && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-500/25 dark:bg-amber-500/5 sm:p-5">
                    <h2 className="mb-3 text-lg font-black text-amber-900 dark:text-amber-200">
                        Asignadas sin fecha
                    </h2>
                    <Lista
                        tareas={sinFecha}
                        onEditar={onEditar}
                        onCambiarEstado={onCambiarEstado}
                    />
                </section>
            )}

            {proximas.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.025] sm:p-5">
                    <h2 className="mb-3 text-lg font-black text-slate-950 dark:text-white">
                        Próximos trabajos
                    </h2>
                    <Lista
                        tareas={proximas}
                        onEditar={onEditar}
                        onCambiarEstado={onCambiarEstado}
                    />
                </section>
            )}
        </div>
    );
}
