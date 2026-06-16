// Toast queue: muestra hasta 4 toasts apilados. Los nuevos se agregan al
// final (FIFO). Si hay más, el resto queda pendiente.

import { createContext, useCallback, useContext, useState } from "react";
import Toast from "../components/ui/Toast";

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = "success", options = {}) => {
        if (!message) return;
        setToasts((prev) => [
            ...prev,
            {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                message,
                type,
                duration: options.duration ?? 3500,
            },
        ]);
    }, []);

    const closeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const clearToasts = useCallback(() => setToasts([]), []);

    return (
        <ToastContext.Provider
            value={{ showToast, closeToast, clearToasts }}
        >
            {children}
            <ToastStack toasts={toasts} onClose={closeToast} />
        </ToastContext.Provider>
    );
};

function ToastStack({ toasts, onClose }) {
    if (!toasts || toasts.length === 0) return null;
    // Hasta 4 visibles. Si hay más, mostramos un "+N más".
    const VISIBLES = 4;
    const visibles = toasts.slice(0, VISIBLES);
    const restantes = toasts.length - visibles.length;

    return (
        <div
            aria-live="polite"
            aria-atomic="true"
            className="pointer-events-none fixed inset-x-3 top-3 z-[55] flex flex-col gap-2 sm:left-auto sm:right-4 sm:top-4 sm:max-w-sm sm:gap-2.5"
            style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
        >
            {visibles.map((t) => (
                <div key={t.id} className="pointer-events-auto">
                    <Toast
                        message={t.message}
                        type={t.type}
                        duration={t.duration}
                        onClose={() => onClose(t.id)}
                    />
                </div>
            ))}
            {restantes > 0 && (
                <div className="pointer-events-auto rounded-xl bg-slate-800/90 px-3 py-1.5 text-center text-xs font-medium text-white shadow-md dark:bg-slate-700/90">
                    Hay {restantes} {restantes === 1 ? "notificación" : "notificaciones"} más…
                </div>
            )}
        </div>
    );
}

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error("useToast debe usarse dentro de un <ToastProvider>");
    }
    return ctx;
};
