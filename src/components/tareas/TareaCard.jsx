import {
    fechaLocalISO,
    formatearFechaTarea,
} from "../../lib/tareasData";

const ESTADO_CLASES = {
    Pendiente:
        "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    "En proceso":
        "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
    Finalizada:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    Cancelada:
        "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-neutral-300",
};

const PRIORIDAD_CLASES = {
    Urgente:
        "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
    Alta: "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300",
    Normal:
        "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300",
    Baja: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
};

export default function TareaCard({
    tarea,
    onEditar,
    onCambiarEstado,
    compacta = false,
}) {
    const activa = ["Pendiente", "En proceso"].includes(tarea.estado);
    const vencida =
        activa &&
        tarea.fecha_programada &&
        tarea.fecha_programada < fechaLocalISO();
    const hora = tarea.hora_inicio
        ? `${String(tarea.hora_inicio).slice(0, 5)}${
              tarea.hora_fin
                  ? `–${String(tarea.hora_fin).slice(0, 5)}`
                  : ""
          }`
        : null;
    const accionEstado =
        tarea.estado === "Pendiente"
            ? { estado: "En proceso", label: "Iniciar", icon: "▶" }
            : tarea.estado === "En proceso"
              ? { estado: "Finalizada", label: "Finalizar", icon: "✓" }
              : tarea.estado === "Finalizada"
                ? { estado: "Pendiente", label: "Reabrir", icon: "↩" }
                : { estado: "Pendiente", label: "Reactivar", icon: "↩" };

    return (
        <article
            className={`overflow-hidden rounded-2xl border bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:bg-carbon-900 ${
                vencida
                    ? "border-rose-300 dark:border-rose-500/35"
                    : "border-slate-200 dark:border-white/10"
            }`}
        >
            <button
                type="button"
                onClick={() => onEditar(tarea)}
                className={`block min-h-[44px] w-full text-left transition hover:bg-slate-50 dark:hover:bg-white/5 ${
                    compacta ? "p-3" : "p-4"
                }`}
                aria-label={`Editar tarea ${tarea.titulo}`}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span
                                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                    ESTADO_CLASES[tarea.estado] ??
                                    ESTADO_CLASES.Pendiente
                                }`}
                            >
                                {tarea.estado}
                            </span>
                            <span
                                className={`rounded-full border px-2 py-0.5 text-xs font-bold ${
                                    PRIORIDAD_CLASES[tarea.prioridad] ??
                                    PRIORIDAD_CLASES.Normal
                                }`}
                            >
                                {tarea.prioridad}
                            </span>
                            <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                                {tarea.tipo === "Terreno" ? "🚐 Terreno" : "🔧 Taller"}
                            </span>
                        </div>
                        <h3 className="mt-2 text-[0.95rem] font-extrabold leading-snug text-slate-900 dark:text-slate-100">
                            {tarea.titulo}
                        </h3>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-semibold text-slate-400 dark:text-neutral-500">
                        #{String(tarea.id).padStart(4, "0")}
                    </span>
                </div>

                {!compacta && tarea.descripcion && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-slate-600 dark:text-neutral-400">
                        {tarea.descripcion}
                    </p>
                )}

                <div className="mt-3 space-y-1.5 text-xs font-medium text-slate-600 dark:text-neutral-300">
                    <p className={vencida ? "font-bold text-rose-600 dark:text-rose-400" : ""}>
                        📅 {formatearFechaTarea(tarea.fecha_programada)}
                        {hora ? ` · ${hora}` : ""}
                        {vencida ? " · Atrasada" : ""}
                    </p>
                    {tarea.tecnicos?.length > 0 ? (
                        <p className="truncate">👷 {tarea.tecnicos.join(", ")}</p>
                    ) : (
                        <p className="font-bold text-amber-700 dark:text-amber-400">
                            ⚠ Sin técnico asignado
                        </p>
                    )}
                    {tarea.cliente_nombre && (
                        <p className="truncate">🏢 {tarea.cliente_nombre}</p>
                    )}
                    {!compacta && tarea.ubicacion && (
                        <p className="truncate">📍 {tarea.ubicacion}</p>
                    )}
                    {!compacta && (
                        <p className="truncate text-slate-500 dark:text-neutral-400">
                            Registrada por: {tarea.autor?.nombre_completo ?? "Registro anterior al inicio de sesión"}
                        </p>
                    )}
                </div>
            </button>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-2.5 dark:border-white/5">
                <button
                    type="button"
                    onClick={() => onEditar(tarea)}
                    className="min-h-[44px] rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                >
                    ✏️ Editar
                </button>
                <button
                    type="button"
                    onClick={() => onCambiarEstado(tarea, accionEstado.estado)}
                    className={`min-h-[44px] rounded-xl px-3 text-xs font-bold text-white transition ${
                        accionEstado.estado === "Finalizada"
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                    {accionEstado.icon} {accionEstado.label}
                </button>
            </div>
        </article>
    );
}

export function EstadoTareaBadge({ estado }) {
    return (
        <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${
                ESTADO_CLASES[estado] ?? ESTADO_CLASES.Pendiente
            }`}
        >
            {estado}
        </span>
    );
}
