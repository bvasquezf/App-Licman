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
            className={`app-modal-backdrop z-50 ${transicion.claseFondo}`}
            onClick={contenido.loading ? undefined : onCancel}
            role="presentation"
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                aria-describedby="confirm-message"
                aria-busy={contenido.loading}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                className={`app-modal-panel max-w-sm ${transicion.clasePanel}`}
            >
                <header className="app-modal-header">
                    <h2 id="confirm-title" className="app-modal-title text-lg">
                        {contenido.title}
                    </h2>
                </header>
                <div className="app-modal-body dialog-scrollbar">
                    <p
                        id="confirm-message"
                        className="text-sm leading-relaxed text-slate-600 dark:text-neutral-400"
                    >
                        {contenido.message}
                    </p>
                </div>
                <footer className="app-modal-footer">
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
                </footer>
            </div>
        </div>
    );
}
