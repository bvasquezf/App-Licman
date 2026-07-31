/**
 * PillToast
 * ---------
 * Componente de UN toast en formato pill (bottom-center).
 *
 * Recibe `{ type, message, duration, onClose }` como props.
 * - type: "success" | "error" | "warning" | "info"
 * - duration: ms antes de auto-cerrarse. Si no llega o es 0, queda
 *   persistente hasta que el usuario lo cierre con la X.
 * - onClose: callback al cerrarse (timer o click manual).
 *
 * Colores por tipo:
 *   success → emerald-500
 *   error   → rose-500
 *   warning → amber-500
 *   info    → slate-700
 */
import { useEffect } from "react";

const ESTILO_POR_TIPO = {
    success: "bg-emerald-500 text-white",
    error: "bg-rose-500 text-white",
    warning: "bg-amber-500 text-white",
    info: "bg-slate-700 text-white",
};

const ICONO_POR_TIPO = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
};

export default function PillToast({
    type = "info",
    message,
    duration,
    onClose,
}) {
    const estilo = ESTILO_POR_TIPO[type] || ESTILO_POR_TIPO.info;
    const icono = ICONO_POR_TIPO[type] || ICONO_POR_TIPO.info;

    // Auto-cierre por timer. Se cancela si el usuario cierra manual,
    // si cambia `duration` (re-creamos el toast con id nuevo igual)
    // o si el componente se desmonta.
    useEffect(() => {
        if (!duration || duration <= 0 || !onClose) return undefined;
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div
            role="status"
            className={`pointer-events-auto flex max-w-md items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg backdrop-blur animate-toast-in ${estilo}`}
        >
            <span aria-hidden="true">{icono}</span>
            <span className="flex-1">{message}</span>
            {onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 hover:bg-white/20 hover:text-white"
                    aria-label="Cerrar notificación"
                >
                    ✕
                </button>
            )}
        </div>
    );
}