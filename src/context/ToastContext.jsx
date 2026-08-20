// Toast queue: muestra hasta 4 toasts apilados como pills en bottom-center.
// API:
//   const toast = useToast();
//   toast.success("Equipo guardado");            // default 4s
//   toast.error("Error al guardar", 6000);       // custom duration
//   toast.warning("Casi sin stock");
//   toast.info("Sincronizando…");
//   toast.showToast("mensaje", "success");       // API legacy
//   toast.cerrar(id);
//
// Máximo por defecto: 8s (errors). Si necesitas más, pasa el 2º arg como
// `toast.error(msg, 10000)` o usa `options.persist: true` para que no se
// cierre solo (requiere que el usuario apriete la X).

import {
    createContext,
    useCallback,
    useContext,
    useState,
} from "react";
import PillToast from "../components/ui/PillToast";

const ToastContext = createContext(null);

const DURACIONES_DEFAULT = {
    success: 4000,
    error: 8000,
    warning: 6000,
    info: 4000,
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback(
        (message, type = "success", options = {}) => {
            if (!message) return null;
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            // `persist: true` → no auto-cierra (PillToast detecta duration falsy).
            // `duration` explícito gana sobre persist.
            const duration = options.persist
                ? 0
                : (options.duration ?? DURACIONES_DEFAULT[type] ?? 4000);
            setToasts((prev) => [
                ...prev,
                {
                    id,
                    message,
                    type,
                    duration,
                },
            ]);
            return id;
        },
        [],
    );

    const cerrar = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const cerrarTodos = useCallback(() => setToasts([]), []);

    const success = useCallback(
        (msg, dur) => showToast(msg, "success", { duration: dur }),
        [showToast],
    );
    const error = useCallback(
        (msg, dur) => showToast(msg, "error", { duration: dur }),
        [showToast],
    );
    const warning = useCallback(
        (msg, dur) => showToast(msg, "warning", { duration: dur }),
        [showToast],
    );
    const info = useCallback(
        (msg, dur) => showToast(msg, "info", { duration: dur }),
        [showToast],
    );

    return (
        <ToastContext.Provider
            value={{
                showToast,
                cerrar,
                cerrarTodos,
                success,
                error,
                warning,
                info,
            }}
        >
            {children}
            <ToastStack toasts={toasts} onCerrar={cerrar} />
        </ToastContext.Provider>
    );
};

function ToastStack({ toasts, onCerrar }) {
    if (!toasts || toasts.length === 0) return null;
    const VISIBLES = 4;
    const visibles = toasts.slice(0, VISIBLES);
    const restantes = toasts.length - visibles.length;

    return (
        <div
            aria-live="polite"
            aria-atomic="true"
            className="pointer-events-none fixed inset-x-3 bottom-3 z-[55] flex flex-col items-center gap-2 sm:bottom-6"
            style={{
                paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
            }}
        >
            {visibles.map((t) => (
                <PillToast
                    key={t.id}
                    type={t.type}
                    message={t.message}
                    duration={t.duration}
                    onClose={() => onCerrar(t.id)}
                />
            ))}
            {restantes > 0 && (
                <div className="pointer-events-auto rounded-full bg-slate-800/90 px-3 py-1 text-center text-xs font-bold text-white shadow-md">
                    +{restantes} más
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