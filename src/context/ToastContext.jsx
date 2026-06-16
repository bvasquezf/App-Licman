import { createContext, useCallback, useContext, useState } from "react";
import Toast from "../components/ui/Toast";

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = "success") => {
        // Reutilizamos el id para evitar colisiones si se llama varias veces
        // en el mismo tick.
        setToast({ message, type, id: Date.now() });
    }, []);

    const closeToast = useCallback(() => {
        setToast(null);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, closeToast }}>
            {children}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={closeToast}
                />
            )}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error("useToast debe usarse dentro de un <ToastProvider>");
    }
    return ctx;
};
