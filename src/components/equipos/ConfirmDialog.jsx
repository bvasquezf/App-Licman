import { useRef } from "react";
import {
    useModalTransition,
    useRetainedValue,
} from "../../hooks/useModalTransition";
import { useDialogA11y } from "../../hooks/useDialogA11y";

export default function ConfirmDialog({
    open,
    title = "¿Estás seguro?",
    message = "Esta acción no se puede deshacer.",
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    onConfirm,
    onCancel,
    peligro = false,
    loading = false,
    loadingLabel = "Procesando…",
}) {
    const dialogRef = useRef(null);
    const transicion = useModalTransition(open);
    const contenido = useRetainedValue(
        {
            title,
            message,
            confirmLabel,
            cancelLabel,
            peligro,
            loading,
            loadingLabel,
        },
        open,
    );

    useDialogA11y(open, {
        dialogRef,
        onClose: onCancel,
        bloquearCierre: loading,
    });

    if (!transicion.renderizar) return null;

    return (
        <div
            className={`fixed inset-0 z-40 flex items-end justify-center bg-slate-900/60 p-4 sm:items-center ${transicion.claseFondo}`}
            onClick={contenido.loading ? undefined : onCancel}
            role="presentation"
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                aria-busy={contenido.loading}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-sm rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.25)] dark:border-white/10 dark:bg-carbon-900 ${transicion.clasePanel}`}
            >
                <h2
                    id="confirm-title"
                    className="text-base font-bold text-slate-900 dark:text-slate-100"
                >
                    {contenido.title}
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-neutral-400">
                    {contenido.message}
                </p>
                <div className="mt-5 flex gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={contenido.loading}
                        data-dialog-autofocus
                        className="min-h-[44px] flex-1 rounded-[10px] bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-carbon-800 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                        {contenido.cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={contenido.loading}
                        className={`min-h-[44px] flex-1 rounded-[10px] px-3 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:cursor-wait disabled:opacity-70 ${
                            contenido.peligro
                                ? "bg-rose-600 hover:bg-rose-700"
                                : "bg-blue-600 hover:bg-blue-700"
                        }`}
                    >
                        {contenido.loading
                            ? contenido.loadingLabel
                            : contenido.confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
