import { useEffect } from "react";

const AUTO_CLOSE_MS = 3500;

function Toast({ message, type = "success", onClose }) {
    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(onClose, AUTO_CLOSE_MS);
        return () => clearTimeout(timer);
    }, [message, onClose]);

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
            className={`fixed inset-x-3 top-3 z-50 mx-auto max-w-sm rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-lg ring-1 ring-black/5 animate-fade-in sm:left-auto sm:right-4 sm:top-4 sm:mx-0 dark:ring-white/10 ${typeStyles}`}
            style={{
                paddingTop: "max(0.75rem, env(safe-area-inset-top))",
            }}
        >
            <div className="flex items-start gap-3">
                <span className="shrink-0 text-base" aria-hidden="true">
                    {icon}
                </span>
                <span className="flex-1 break-words">{message}</span>
                <button
                    onClick={onClose}
                    className="shrink-0 rounded p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                    aria-label="Cerrar notificación"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}

export default Toast;
