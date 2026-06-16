// Componente individual de un toast. El stacking/montaje lo hace
// `ToastStack` desde el `ToastContext` para soportar múltiples a la vez.

import { useEffect } from "react";

const AUTO_CLOSE_MS = 3500;

function Toast({ message, type = "success", duration = AUTO_CLOSE_MS, onClose }) {
    useEffect(() => {
        if (!message || !onClose) return;
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [message, duration, onClose]);

    if (!message) return null;

    const typeStyles =
        type === "error"
            ? "bg-rose-600 dark:bg-rose-500"
            : type === "warning"
            ? "bg-amber-500 dark:bg-amber-400"
            : "bg-emerald-600 dark:bg-emerald-500";

    const icon =
        type === "error" ? "⚠️" : type === "warning" ? "⚠️" : "✓";

    return (
        <div
            role={type === "error" ? "alert" : "status"}
            className={`rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-lg ring-1 ring-black/5 animate-fade-in dark:ring-white/10 ${typeStyles}`}
        >
            <div className="flex items-start gap-3">
                <span className="shrink-0 text-base" aria-hidden="true">
                    {icon}
                </span>
                <span className="flex-1 break-words">{message}</span>
                <button
                    onClick={onClose}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                    aria-label="Cerrar notificación"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}

export default Toast;
