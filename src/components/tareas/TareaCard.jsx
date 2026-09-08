import {
    fechaLocalISO,
    formatearFechaTarea,
} from "../../lib/tareasData";
import { useAuth } from "../../context/AuthContext";
import { PERMISOS } from "../../lib/authPermissions";
import {
    equipoIdentificado,
    propiedadEquipoTarea,
    resumenEquipoTarea,
} from "../../lib/tareasEquipo";
import RequerimientoBadge from "./RequerimientoBadge";
import EquipoPropiedadBadge from "./EquipoPropiedadBadge";

const ESTADO_CLASES = {
    "Por programar":
        "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    Programada:
        "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
    "En proceso":
        "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
    "En espera":
        "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
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
    const { profile, puede } = useAuth();
    const puedePlanificar = puede(PERMISOS.TAREAS_PLANIFICAR);
    const esPropia = Boolean(
        profile?.id && tarea.tecnico_ids?.includes(profile.id),
    );
    const puedeEjecutarPropia = Boolean(
        puede(PERMISOS.TAREAS_EJECUTAR_PROPIAS) && esPropia,
    );
    const activa = [
        "Por programar",
        "Programada",
        "En proceso",
        "En espera",
    ].includes(tarea.estado);
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
    const planificacionCompleta = Boolean(
        tarea.fecha_programada &&
            tarea.tecnico_ids?.length &&
            equipoIdentificado(tarea),
    );
    const propiedadEquipo = propiedadEquipoTarea(tarea);
    const faltantes = [
        !tarea.fecha_programada ? "fecha" : null,
        !tarea.tecnico_ids?.length ? "técnico" : null,
        !equipoIdentificado(tarea) ? "equipo" : null,
    ].filter(Boolean);
    const estadoReapertura = planificacionCompleta
        ? "Programada"
        : "Por programar";
    const accionEstado =
        tarea.estado === "Por programar" ||
        (tarea.estado === "Programada" && !planificacionCompleta)
            ? { editar: true, label: "Programar", icon: "📅" }
            : tarea.estado === "Programada"
              ? { estado: "En proceso", label: "Iniciar", icon: "▶" }
              : tarea.estado === "En proceso"
                ? { estado: "Finalizada", label: "Finalizar", icon: "✓" }
                : tarea.estado === "En espera"
                  ? { estado: "En proceso", label: "Reanudar", icon: "▶" }
                  : tarea.estado === "Finalizada"
                    ? {
                          estado: estadoReapertura,
                          label: "Reabrir",
                          icon: "↩",
                      }
                    : {
                          estado: estadoReapertura,
                          label: "Reactivar",
                          icon: "↩",
                      };
    const puedePausar =
        tarea.estado === "En proceso" &&
        (puedePlanificar || puedeEjecutarPropia);
    const transicionTecnicoPermitida =
        (tarea.estado === "Programada" &&
            accionEstado.estado === "En proceso") ||
        (tarea.estado === "En proceso" &&
            accionEstado.estado === "Finalizada") ||
        (tarea.estado === "En espera" &&
            accionEstado.estado === "En proceso");
    const puedeAccionPrincipal = accionEstado.editar
        ? puedePlanificar
        : puedePlanificar ||
          (puedeEjecutarPropia && transicionTecnicoPermitida);
    const cantidadAcciones =
        1 + Number(puedePausar) + Number(puedeAccionPrincipal);

    return (
        <article
            className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:bg-carbon-900 ${
                vencida
                    ? "border-rose-300 dark:border-rose-500/35"
                    : "border-slate-200 dark:border-white/10"
            }`}
        >
            <button
                type="button"
                onClick={() => onEditar(tarea)}
                className={`flex min-h-[44px] w-full flex-1 flex-col text-left transition hover:bg-slate-50 dark:hover:bg-white/5 ${
                    compacta ? "p-3" : "p-4"
                }`}
                aria-label={`${puedePlanificar ? "Editar" : "Abrir detalle de"} el requerimiento ${tarea.titulo}, estado ${tarea.estado}, prioridad ${tarea.prioridad}`}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span
                                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                    ESTADO_CLASES[tarea.estado] ??
                                    ESTADO_CLASES["Por programar"]
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
                            <RequerimientoBadge
                                categoria={tarea.categoria_requerimiento}
                                compacta
                            />
                            <EquipoPropiedadBadge tarea={tarea} compacta />
                            <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                                {tarea.tipo === "Terreno" ? "🚐 Terreno" : "🔧 Taller"}
                            </span>
                        </div>
                        <h3 className={`${compacta ? "" : "min-h-10 line-clamp-2"} mt-2 text-[0.95rem] font-extrabold leading-snug text-slate-900 dark:text-slate-100`}>
                            {tarea.titulo}
                        </h3>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-semibold text-slate-400 dark:text-neutral-500">
                        #{String(tarea.id).padStart(4, "0")}
                    </span>
                </div>

                {!compacta && (
                    <p className={`mt-1.5 min-h-10 line-clamp-2 text-sm ${tarea.descripcion ? "text-slate-600 dark:text-neutral-400" : "text-slate-400 dark:text-neutral-500"}`}>
                        {tarea.descripcion || "Sin descripción adicional."}
                    </p>
                )}

                <div className="mt-3 flex-1 space-y-1.5 text-xs font-medium text-slate-600 dark:text-neutral-300">
                    {faltantes.length > 0 && activa && (
                        <p className="rounded-lg bg-amber-50 px-2.5 py-2 font-extrabold text-amber-800 ring-1 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                            ⚠ Falta definir {faltantes.join(" y ")}
                        </p>
                    )}
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
                    {!compacta &&
                        ["Licman", "Cliente"].includes(
                            propiedadEquipo.valor,
                        ) && (
                            <p className="truncate">
                                🚜 {resumenEquipoTarea(tarea)}
                            </p>
                        )}
                    {tarea.estado === "En espera" && tarea.motivo_espera && (
                        <p className="line-clamp-2 font-bold text-orange-700 dark:text-orange-300">
                            ⏸ {tarea.motivo_espera}
                        </p>
                    )}
                    {tarea.estado === "Finalizada" && tarea.resultado && !compacta && (
                        <p className="line-clamp-2 font-semibold text-emerald-700 dark:text-emerald-300">
                            ✓ {tarea.resultado}
                        </p>
                    )}
                    {!compacta && (
                        <p className="truncate text-slate-500 dark:text-neutral-400">
                            Registrada por: {tarea.autor?.nombre_completo ?? "Registro anterior al inicio de sesión"}
                        </p>
                    )}
                </div>
            </button>

            <div
                className={`grid gap-2 border-t border-slate-100 p-2.5 dark:border-white/5 ${
                    cantidadAcciones === 3
                        ? "grid-cols-3"
                        : cantidadAcciones === 2
                          ? "grid-cols-2"
                          : "grid-cols-1"
                }`}
            >
                <button
                    type="button"
                    onClick={() => onEditar(tarea)}
                    className="min-h-[44px] rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                >
                    {puedePlanificar ? "✏️ Editar" : "👁️ Ver detalle"}
                </button>
                {puedePausar && (
                    <button
                        type="button"
                        onClick={() => onCambiarEstado(tarea, "En espera")}
                        className="min-h-[44px] rounded-xl bg-amber-100 px-2 text-xs font-bold text-amber-800 transition hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25"
                    >
                        ⏸ Espera
                    </button>
                )}
                {puedeAccionPrincipal && (
                    <button
                        type="button"
                        onClick={() =>
                            accionEstado.editar
                                ? onEditar(tarea)
                                : onCambiarEstado(tarea, accionEstado.estado)
                        }
                        className={`min-h-[44px] rounded-xl px-3 text-xs font-bold text-white transition ${
                            accionEstado.estado === "Finalizada"
                                ? "bg-emerald-600 hover:bg-emerald-700"
                                : "bg-blue-600 hover:bg-blue-700"
                        }`}
                    >
                        {accionEstado.icon} {accionEstado.label}
                    </button>
                )}
            </div>
        </article>
    );
}

export function EstadoTareaBadge({ estado }) {
    return (
        <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${
                ESTADO_CLASES[estado] ?? ESTADO_CLASES["Por programar"]
            }`}
        >
            {estado}
        </span>
    );
}
