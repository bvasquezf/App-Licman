import { useEffect } from "react";

export default function ConfirmDialog({
    open,
    title = "¿Estás seguro?",
    message = "Esta acción no se puede deshacer.",
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    onConfirm,
    onCancel,
    peligro = false,
}) {
    useEffect(() => {
        if (!open) return undefined;
        const handler = (e) => {
            if (e.key === "Escape") onCancel?.();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onCancel]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/60 p-4 backdrop-blur-sm sm:items-center"
            onClick={onCancel}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.25)] dark:border-white/10 dark:bg-carbon-900"
            >
                <h2
                    id="confirm-title"
                    className="text-base font-bold text-slate-900 dark:text-slate-100"
                >
                    {title}
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-neutral-400">{message}</p>
                <div className="mt-5 flex gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 rounded-[10px] bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-200 dark:bg-carbon-800 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`flex-1 rounded-[10px] px-3 py-2.5 text-sm font-bold text-white shadow-sm transition ${
                            peligro
                                ? "bg-rose-600 hover:bg-rose-700"
                                : "bg-blue-600 hover:bg-blue-700"
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}