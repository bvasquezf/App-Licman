import { useEffect, useRef, useState } from "react";
import { ESTADOS, ESTADO_CHIP } from "../../lib/equiposConstants";
import {
    useModalTransition,
    useRetainedValue,
} from "../../hooks/useModalTransition";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { useResponsableSesion } from "../../hooks/useResponsableSesion";
import EstadoBadge from "./EstadoBadge";

const clasesInput =
    "mt-1 block w-full rounded-[10px] border-[1.5px] border-slate-300 bg-white px-3 py-2.5 text-base font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100 dark:placeholder-neutral-500";

// Icono por estado para las tiles del picker.
const ICONO_ESTADO = {
    Operativo: "✅",
    "Operativo con observaciones": "⚠️",
    Inoperativo: "⛔",
};

/**
 * Diálogo para cambiar el estado operacional de un equipo
 * (ej. Inoperativo → Operativo tras una reparación).
 *
 * El cambio NO mueve el equipo de bodega/cliente: solo actualiza
 * `estado_operacional` vía RPC `actualizar_estado_equipo`, que además
 * deja traza en el historial de movimientos.
 *
 * Props:
 *  - open: boolean
 *  - equipo: { id, marca, modelo, numero_interno, estado_operacional }
 *  - onSubmit(payload): async — { id, estado, responsable, notas }.
 *      El padre cierra el dialog si el guardado fue exitoso.
 *  - onCancel(): void
 */
export default function EstadoDialog({
    open,
    equipo: equipoProp,
    onSubmit,
    onCancel,
}) {
    const dialogRef = useRef(null);
    const responsableSesion = useResponsableSesion();
    const transicion = useModalTransition(open);
    const equipo = useRetainedValue(
        equipoProp,
        open && Boolean(equipoProp),
    );
    const [estado, setEstado] = useState("");
    const [horometro, setHorometro] = useState("");
    const [responsable, setResponsable] = useState("");
    const [notas, setNotas] = useState("");
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(false);
    const [versionFormulario, setVersionFormulario] = useState(0);

    useUnsavedChanges({ estado, horometro, responsable, notas }, {
        habilitado: open && !guardando,
        resetKey: versionFormulario,
    });

    // Reset al abrir: precarga el estado actual del equipo
    useEffect(() => {
        if (open) {
            setEstado(equipo?.estado_operacional ?? "");
            setHorometro(
                equipo?.horometro === null || equipo?.horometro === undefined
                    ? ""
                    : String(equipo.horometro),
            );
            setResponsable(responsableSesion);
            setNotas("");
            setErrores({});
            setGuardando(false);
            setVersionFormulario((version) => version + 1);
        }
    }, [open, equipo, responsableSesion]);

    useDialogA11y(open, {
        dialogRef,
        onClose: onCancel,
        bloquearCierre: guardando,
    });

    if (!transicion.renderizar || !equipo) return null;
    const equipoVendido = Boolean(equipo.vendido);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = {};
        if (!ESTADOS.includes(estado)) errs.estado = "Selecciona un estado";
        if (estado === equipo.estado_operacional)
            errs.estado = "El equipo ya está en ese estado";
        const horometroNumero = Number(horometro);
        if (horometro.trim() === "") {
            errs.horometro = "Ingresa el horómetro actualizado";
        } else if (!Number.isFinite(horometroNumero) || horometroNumero < 0) {
            errs.horometro = "Ingresa un horómetro válido (mayor o igual a 0)";
        } else if (
            equipo.horometro !== null &&
            equipo.horometro !== undefined &&
            horometroNumero < Number(equipo.horometro)
        ) {
            errs.horometro = `Debe ser igual o mayor al actual (${equipo.horometro} h)`;
        }
        if (!responsable.trim()) errs.responsable = "Indica quién registra";
        if (equipoVendido && !notas.trim()) {
            errs.notas = "Describe el diagnóstico y el trabajo realizado";
        }
        if (Object.keys(errs).length > 0) {
            setErrores(errs);
            return;
        }

        setGuardando(true);
        try {
            await onSubmit({
                id: equipo.id,
                estado,
                horometro: horometroNumero,
                responsable: responsable.trim(),
                notas: notas.trim() || null,
            });
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="estado-titulo"
            aria-busy={guardando}
            tabIndex={-1}
            className={`app-modal-backdrop z-50 ${transicion.claseFondo}`}
            onClick={(e) => {
                if (e.target === e.currentTarget && !guardando) onCancel();
            }}
        >
            <div
                className={`app-modal-panel max-w-lg ${transicion.clasePanel}`}
            >
                <header className="app-modal-header">
                    <div>
                        <h2
                            id="estado-titulo"
                            className="text-[1.15rem] font-bold text-slate-900 dark:text-slate-100"
                        >
                            {equipoVendido
                                ? "🧰 Estado y trabajo técnico"
                                : "🛠️ Cambiar estado"}
                        </h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                        {equipo.marca} {equipo.modelo} ·{" "}
                        <span className="font-mono font-semibold">
                            {equipo.numero_interno}
                        </span>
                    </p>
                        <p className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400">
                        Estado actual:
                        <EstadoBadge estado={equipo.estado_operacional} />
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={guardando}
                        data-dialog-autofocus
                        className="app-modal-close"
                        aria-label="Cerrar cambio de estado"
                    >
                        ×
                    </button>
                </header>

                <form
                    onSubmit={handleSubmit}
                    className="flex min-h-0 flex-1 flex-col"
                    noValidate
                >
                    <div className="app-modal-body dialog-scrollbar space-y-4">
                    {equipoVendido && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
                            <strong>💰 Equipo vendido</strong>
                            <p className="mt-1 text-xs">
                                El cambio de estado quedará respaldado con el
                                detalle obligatorio del trabajo técnico.
                            </p>
                        </div>
                    )}
                    {/* Picker de estado: tiles grandes */}
                    <div>
                        <p className="text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                            Nuevo estado
                        </p>
                        <div
                            role="radiogroup"
                            aria-label="Nuevo estado operacional"
                            className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-3"
                        >
                            {ESTADOS.map((op) => {
                                const seleccionado = estado === op;
                                return (
                                    <button
                                        key={op}
                                        type="button"
                                        role="radio"
                                        aria-checked={seleccionado}
                                        onClick={() => {
                                            setEstado(op);
                                            setErrores((prev) => {
                                                const next = { ...prev };
                                                delete next.estado;
                                                return next;
                                            });
                                        }}
                                        className={`flex min-h-[52px] items-center justify-center gap-2 rounded-[10px] border-[1.5px] px-3 py-2 text-center transition active:scale-[0.97] ${
                                            seleccionado
                                                ? "border-blue-600 bg-blue-50 text-blue-800 shadow-[0_0_0_3px_rgba(37,99,235,0.15)] dark:bg-blue-500/15 dark:text-blue-300"
                                                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200 dark:hover:bg-white/10"
                                        }`}
                                    >
                                        <span className="text-xl leading-none">
                                            {ICONO_ESTADO[op]}
                                        </span>
                                        <span className="text-[0.8rem] font-bold leading-tight">
                                            {ESTADO_CHIP[op] ?? op}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {errores.estado && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errores.estado}
                            </p>
                        )}
                    </div>

                    {/* Horómetro: también forma parte del movimiento de estado */}
                    <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Horómetro actualizado
                        <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-neutral-400">
                            Actual: {equipo.horometro ?? "sin registro"} h
                        </span>
                        <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="any"
                            value={horometro}
                            onChange={(e) => {
                                setHorometro(e.target.value);
                                setErrores((prev) => {
                                    const next = { ...prev };
                                    delete next.horometro;
                                    return next;
                                });
                            }}
                            placeholder="Ej. 1250.5"
                            className={clasesInput}
                        />
                        {errores.horometro && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errores.horometro}
                            </p>
                        )}
                    </label>

                    {/* Responsable autenticado */}
                    <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                        Responsable
                        <input
                            type="text"
                            value={responsable}
                            readOnly
                            aria-readonly="true"
                            className={clasesInput}
                        />
                        {errores.responsable && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errores.responsable}
                            </p>
                        )}
                    </label>

                    {/* Detalle técnico obligatorio para equipos vendidos */}
                    <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                        {equipoVendido ? "Trabajo realizado / diagnóstico" : "Notas"}{" "}
                        {equipoVendido ? (
                            <span className="font-normal text-rose-600">*</span>
                        ) : (
                            <span className="font-normal text-slate-500 dark:text-neutral-400">
                                (opcional)
                            </span>
                        )}
                        <textarea
                            rows={2}
                            value={notas}
                            onChange={(e) => {
                                setNotas(e.target.value);
                                setErrores((prev) => {
                                    const next = { ...prev };
                                    delete next.notas;
                                    return next;
                                });
                            }}
                            placeholder={
                                equipoVendido
                                    ? "Describe qué revisó o reparó el técnico y cómo quedó..."
                                    : "Ej. se reparó el motor hidráulico, quedó probado"
                            }
                            className={`${clasesInput} resize-y`}
                        />
                        {errores.notas && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errores.notas}
                            </p>
                        )}
                    </label>

                    </div>

                    <footer className="app-modal-footer">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={guardando}
                            className="flex-1 rounded-[10px] bg-slate-100 px-4 py-3 text-base font-bold text-slate-900 transition hover:bg-slate-200 disabled:opacity-50 dark:bg-carbon-800 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={guardando}
                            className="min-h-[44px] rounded-[10px] bg-blue-600 px-4 py-3 text-base font-bold text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {guardando
                                ? "Guardando…"
                                : equipoVendido
                                  ? "Guardar estado y trabajo"
                                  : "Guardar estado"}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
}
