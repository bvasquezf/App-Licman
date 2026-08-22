import { useEffect, useRef, useState } from "react";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import {
    useModalTransition,
    useRetainedValue,
} from "../../hooks/useModalTransition";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";

const CONFIGURACION = {
    "En espera": {
        icono: "⏸️",
        titulo: "Dejar tarea en espera",
        descripcion:
            "Explica qué falta para que cualquier persona pueda retomarla sin perder contexto.",
        etiqueta: "Motivo de espera",
        placeholder:
            "Ej. Falta confirmar acceso con el cliente o llegó un repuesto incorrecto…",
        boton: "Dejar en espera",
        claseBoton: "bg-amber-600 hover:bg-amber-700",
    },
    Finalizada: {
        icono: "✅",
        titulo: "Finalizar tarea",
        descripcion:
            "Deja un resultado breve y concreto del trabajo realizado.",
        etiqueta: "Resultado del trabajo",
        placeholder:
            "Ej. Equipo operativo; se cambió manguera y se realizaron pruebas sin fugas…",
        boton: "Finalizar tarea",
        claseBoton: "bg-emerald-600 hover:bg-emerald-700",
    },
};

export default function TareaEstadoDialog({
    open,
    tarea,
    estado,
    onClose,
    onConfirmar,
}) {
    const transicion = useModalTransition(open);
    const tareaActual = useRetainedValue(tarea, open);
    const estadoActual = useRetainedValue(estado, open);
    const dialogRef = useRef(null);
    const textareaRef = useRef(null);
    const [detalle, setDetalle] = useState("");
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [versionFormulario, setVersionFormulario] = useState(0);
    const configuracion =
        CONFIGURACION[estadoActual] ?? CONFIGURACION.Finalizada;

    useEffect(() => {
        if (!open) return;
        setDetalle(
            estadoActual === "En espera"
                ? tareaActual?.motivo_espera ?? ""
                : tareaActual?.resultado ?? "",
        );
        setError("");
        setGuardando(false);
        setVersionFormulario((version) => version + 1);
    }, [estadoActual, open, tareaActual]);

    useUnsavedChanges(
        { detalle },
        {
            habilitado: open && !guardando,
            resetKey: `${tareaActual?.id ?? "sin-tarea"}-${estadoActual}-${versionFormulario}`,
        },
    );

    const cerrar = () => {
        if (!guardando) onClose();
    };

    useDialogA11y(open, {
        dialogRef,
        onClose: cerrar,
        bloquearCierre: guardando,
    });

    if (!transicion.renderizar) return null;

    const enviar = async (event) => {
        event.preventDefault();
        const limpio = detalle.trim();
        if (!limpio) {
            setError(
                estadoActual === "En espera"
                    ? "Indica por qué el trabajo quedó detenido"
                    : "Registra el resultado antes de finalizar",
            );
            textareaRef.current?.focus();
            return;
        }

        setGuardando(true);
        try {
            const guardado = await onConfirmar(limpio);
            if (guardado) onClose();
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tarea-estado-titulo"
            tabIndex={-1}
            className={`fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/65 sm:items-center sm:p-4 ${transicion.claseFondo}`}
            onClick={(event) => {
                if (event.target === event.currentTarget) cerrar();
            }}
        >
            <div
                className={`w-full max-w-lg overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl dark:border-white/10 dark:bg-carbon-900 ${transicion.clasePanel}`}
            >
                <header
                    className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 pb-4 pt-5 sm:px-6 dark:border-white/10"
                    style={{
                        paddingTop: "max(1.25rem, env(safe-area-inset-top))",
                    }}
                >
                    <div className="min-w-0">
                        <p className="text-2xl" aria-hidden="true">
                            {configuracion.icono}
                        </p>
                        <h2
                            id="tarea-estado-titulo"
                            className="mt-1 text-lg font-black text-slate-950 dark:text-white"
                        >
                            {configuracion.titulo}
                        </h2>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-neutral-400">
                            Tarea #{String(tareaActual?.id ?? "").padStart(4, "0")} ·{" "}
                            {tareaActual?.titulo}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={cerrar}
                        disabled={guardando}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-white/10"
                        aria-label="Cerrar"
                    >
                        ×
                    </button>
                </header>

                <form onSubmit={enviar} noValidate>
                    <div className="space-y-4 px-5 py-5 sm:px-6">
                        <p className="text-sm leading-relaxed text-slate-600 dark:text-neutral-300">
                            {configuracion.descripcion}
                        </p>
                        <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                            {configuracion.etiqueta}{" "}
                            <span className="text-rose-600">*</span>
                            <textarea
                                ref={textareaRef}
                                value={detalle}
                                onChange={(event) => {
                                    setDetalle(event.target.value);
                                    if (error) setError("");
                                }}
                                rows={4}
                                placeholder={configuracion.placeholder}
                                className={`mt-1 block w-full rounded-xl border-[1.5px] bg-white px-3 py-3 text-base text-slate-900 outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 dark:bg-carbon-800 dark:text-slate-100 ${
                                    error
                                        ? "border-rose-500"
                                        : "border-slate-300 dark:border-white/15"
                                }`}
                            />
                            {error && (
                                <span className="mt-1 block text-xs text-rose-600">
                                    {error}
                                </span>
                            )}
                        </label>
                    </div>

                    <footer
                        className="grid grid-cols-2 gap-2 border-t border-slate-200 px-5 pt-3 sm:px-6 dark:border-white/10"
                        style={{
                            paddingBottom:
                                "max(0.75rem, env(safe-area-inset-bottom))",
                        }}
                    >
                        <button
                            type="button"
                            onClick={cerrar}
                            disabled={guardando}
                            className="min-h-[48px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={guardando}
                            className={`min-h-[48px] rounded-xl px-4 text-sm font-extrabold text-white disabled:opacity-60 ${configuracion.claseBoton}`}
                        >
                            {guardando ? "Guardando…" : configuracion.boton}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
}
