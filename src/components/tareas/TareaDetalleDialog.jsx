import { useRef } from "react";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import {
    useModalTransition,
    useRetainedValue,
} from "../../hooks/useModalTransition";
import { formatearFechaTarea } from "../../lib/tareasData";
import { EstadoTareaBadge } from "./TareaCard";
import TareaHistorial from "./TareaHistorial";
import RequerimientoBadge from "./RequerimientoBadge";

function valorOPlaceholder(
    valor,
    placeholder = "Sin información registrada",
) {
    return String(valor ?? "").trim() || placeholder;
}

function telefonoDesdeContacto(contacto) {
    const candidato = String(contacto ?? "").match(/\+?[\d\s()-]{8,}/)?.[0];
    if (!candidato) return null;
    const normalizado = candidato.replace(/[^\d+]/g, "");
    return normalizado.replace(/\D/g, "").length >= 8 ? normalizado : null;
}

function CampoDetalle({ icono, etiqueta, children, destacado = false }) {
    return (
        <div
            className={`flex h-full min-h-[132px] flex-col rounded-2xl border p-4 ${
                destacado
                    ? "border-blue-200 bg-blue-50/70 dark:border-blue-500/25 dark:bg-blue-500/5"
                    : "border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.025]"
            }`}
        >
            <dt className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                <span aria-hidden="true">{icono}</span> {etiqueta}
            </dt>
            <dd className="mt-1.5 flex flex-1 flex-col justify-start break-words text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-200">
                {children}
            </dd>
        </div>
    );
}

export default function TareaDetalleDialog({ open, tarea, onClose }) {
    const transicion = useModalTransition(open);
    const tareaVisible = useRetainedValue(tarea, open);
    const dialogRef = useRef(null);
    const telefono = telefonoDesdeContacto(tareaVisible?.contacto);
    const hora = tareaVisible?.hora_inicio
        ? `${String(tareaVisible.hora_inicio).slice(0, 5)}${
              tareaVisible.hora_fin
                  ? ` a ${String(tareaVisible.hora_fin).slice(0, 5)}`
                  : ""
          }`
        : "Horario por confirmar";
    const faltantes = [
        !tareaVisible?.fecha_programada ? "fecha" : null,
        !tareaVisible?.tecnico_ids?.length ? "técnico" : null,
    ].filter(Boolean);

    useDialogA11y(open, { dialogRef, onClose });

    if (!transicion.renderizar || !tareaVisible) return null;

    return (
        <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tarea-detalle-titulo"
            tabIndex={-1}
            className={`app-modal-backdrop z-[60] ${transicion.claseFondo}`}
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                className={`app-modal-panel max-w-3xl ${transicion.clasePanel}`}
            >
                <header className="app-modal-header">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <EstadoTareaBadge estado={tareaVisible.estado} />
                            <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600 dark:border-white/10 dark:text-neutral-300">
                                {tareaVisible.prioridad}
                            </span>
                            <RequerimientoBadge
                                categoria={tareaVisible.categoria_requerimiento}
                                compacta
                            />
                            <span className="text-xs font-bold text-slate-500 dark:text-neutral-400">
                                {tareaVisible.tipo === "Terreno"
                                    ? "🚐 Terreno"
                                    : "🔧 Taller"}
                            </span>
                        </div>
                        <h2
                            id="tarea-detalle-titulo"
                            className="mt-2 text-xl font-black leading-tight text-slate-950 dark:text-white sm:text-2xl"
                        >
                            {tareaVisible.titulo}
                        </h2>
                        <p className="mt-1 font-mono text-xs font-semibold text-slate-500 dark:text-neutral-400">
                            Requerimiento #{String(tareaVisible.id).padStart(4, "0")}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="app-modal-close"
                        aria-label="Cerrar detalle de la tarea"
                    >
                        ×
                    </button>
                </header>

                <div className="app-modal-body dialog-scrollbar space-y-5">
                    {faltantes.length > 0 &&
                        [
                            "Por programar",
                            "Programada",
                            "En proceso",
                            "En espera",
                        ].includes(tareaVisible.estado) && (
                            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-extrabold text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
                                ⚠ Pendiente de planificación: falta definir{" "}
                                {faltantes.join(" y ")}.
                            </p>
                        )}
                    {tareaVisible.descripcion && (
                        <section aria-labelledby="detalle-descripcion">
                            <h3
                                id="detalle-descripcion"
                                className="text-sm font-black text-slate-950 dark:text-white"
                            >
                                Trabajo solicitado
                            </h3>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-neutral-300">
                                {tareaVisible.descripcion}
                            </p>
                        </section>
                    )}

                    <dl className="grid auto-rows-fr gap-3 sm:grid-cols-2">
                        <CampoDetalle icono="📨" etiqueta="Origen">
                            {valorOPlaceholder(
                                [
                                    tareaVisible.origen_requerimiento,
                                    tareaVisible.referencia_origen,
                                ]
                                    .filter(Boolean)
                                    .join(" · "),
                            )}
                        </CampoDetalle>
                        <CampoDetalle icono="📅" etiqueta="Planificación" destacado>
                            {formatearFechaTarea(tareaVisible.fecha_programada)} · {hora}
                        </CampoDetalle>
                        <CampoDetalle icono="👷" etiqueta="Técnicos" destacado>
                            {tareaVisible.tecnicos?.length
                                ? tareaVisible.tecnicos.join(", ")
                                : "Sin técnico asignado"}
                        </CampoDetalle>
                        <CampoDetalle icono="🏢" etiqueta="Cliente">
                            {valorOPlaceholder(tareaVisible.cliente_nombre)}
                        </CampoDetalle>
                        <CampoDetalle icono="☎️" etiqueta="Contacto">
                            <div className="flex flex-col items-start">
                                <span>
                                    {valorOPlaceholder(tareaVisible.contacto)}
                                </span>
                                {telefono && (
                                    <a
                                        href={`tel:${telefono}`}
                                        className="mt-2 inline-flex min-h-[44px] items-center rounded-xl bg-emerald-600 px-4 text-xs font-extrabold text-white hover:bg-emerald-700"
                                    >
                                        Llamar al contacto
                                    </a>
                                )}
                            </div>
                        </CampoDetalle>
                        <CampoDetalle icono="📍" etiqueta="Ubicación">
                            <div className="flex flex-col items-start">
                                <span>
                                    {valorOPlaceholder(tareaVisible.ubicacion)}
                                </span>
                                {tareaVisible.ubicacion && (
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tareaVisible.ubicacion)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-2 inline-flex min-h-[44px] items-center rounded-xl bg-blue-600 px-4 text-xs font-extrabold text-white hover:bg-blue-700"
                                    >
                                        Abrir en Maps
                                    </a>
                                )}
                            </div>
                        </CampoDetalle>
                        <CampoDetalle icono="🚜" etiqueta="Equipo">
                            {valorOPlaceholder(tareaVisible.equipo_referencia)}
                        </CampoDetalle>
                    </dl>

                    {tareaVisible.observaciones && (
                        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/25 dark:bg-amber-500/5">
                            <h3 className="text-sm font-black text-amber-950 dark:text-amber-200">
                                📝 Observaciones
                            </h3>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-amber-900 dark:text-amber-200">
                                {tareaVisible.observaciones}
                            </p>
                        </section>
                    )}

                    {tareaVisible.motivo_espera && (
                        <section className="rounded-2xl border border-orange-200 bg-orange-50/70 p-4 dark:border-orange-500/25 dark:bg-orange-500/5">
                            <h3 className="text-sm font-black text-orange-950 dark:text-orange-200">
                                ⏸ Motivo de espera
                            </h3>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-orange-900 dark:text-orange-200">
                                {tareaVisible.motivo_espera}
                            </p>
                        </section>
                    )}

                    {tareaVisible.resultado && (
                        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/25 dark:bg-emerald-500/5">
                            <h3 className="text-sm font-black text-emerald-950 dark:text-emerald-200">
                                ✅ Resultado registrado
                            </h3>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-emerald-900 dark:text-emerald-200">
                                {tareaVisible.resultado}
                            </p>
                        </section>
                    )}

                    <p className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                        Registrada por: {tareaVisible.autor?.nombre_completo ?? "registro anterior al inicio de sesión"}
                    </p>

                    <TareaHistorial tareaId={tareaVisible.id} />
                </div>

                <footer className="app-modal-footer app-modal-footer--single">
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-[48px] w-full rounded-xl bg-slate-900 px-4 text-sm font-extrabold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-neutral-200"
                    >
                        Cerrar detalle
                    </button>
                </footer>
            </div>
        </div>
    );
}
