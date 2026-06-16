import { useEffect } from "react";

const AUTO_CLOSE_MS = 3500;

function Toast({ message, type = "success", onClose }) {
    // Auto-cierre después de unos segundos
    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(onClose, AUTO_CLOSE_MS);
        return () => clearTimeout(timer);
    }, [message, onClose]);

    if (!message) return null;

    const baseStyles =
        "fixed right-4 top-4 z-50 rounded-xl px-4 py-3 shadow-lg text-white";

    const typeStyles =
        type === "error"
            ? "bg-red-600"
            : type === "warning"
            ? "bg-yellow-500"
            : "bg-green-600";

    return (
        <div
            role={type === "error" ? "alert" : "status"}
            className={`${baseStyles} ${typeStyles}`}
        >
            <div className="flex items-center gap-3">
                <span>{message}</span>
                <button
                    onClick={onClose}
                    className="rounded px-2 py-1 text-sm font-bold hover:bg-white/20"
                    aria-label="Cerrar notificación"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}

export default Toast;
