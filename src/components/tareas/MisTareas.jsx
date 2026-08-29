import EmptyState from "../ui/EmptyState";
import TareasListaPaginada from "./TareasListaPaginada";
import {
    compararTareas,
    estaTareaActiva,
    fechaLocalISO,
} from "../../lib/tareasData";
import { useAuth } from "../../context/AuthContext";
import { PERMISOS } from "../../lib/authPermissions";

function Lista({ tareas, onEditar, onCambiarEstado }) {
    return (
        <TareasListaPaginada
            tareas={tareas}
            onEditar={onEditar}
            onCambiarEstado={onCambiarEstado}
        />
    );
}

export default function MisTareas({
    tareas,
    perfil,
    onEditar,
    onCambiarEstado,
}) {
    const { puede } = useAuth();
    const hoy = fechaLocalISO();

    if (!puede(PERMISOS.TAREAS_EJECUTAR_PROPIAS)) {
        return (
            <div className="mx-auto max-w-2xl">
                <EmptyState
                    icon="🪪"
                    title="Esta es la vista personal de los técnicos"
                    description={`Tu cuenta “${perfil?.nombre_completo ?? "Sin nombre"}” tiene el rol ${perfil?.rol_nombre ?? "actual"}. Esta vista se habilita para quienes tienen permiso de ejecutar sus tareas asignadas.`}
                />
            </div>
        );
    }

    const asignadas = tareas
        .filter(
            (tarea) =>
                tarea.tecnico_ids?.includes(perfil.id) &&
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
                    Tus asignaciones están vinculadas directamente a esta
                    cuenta. Desde aquí puedes iniciar, pausar y cerrar tus
                    trabajos.
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
