// NetworkContext
// --------------
// Estado de conexión + cola de sincronización del Inventario de
// Equipos. Replica el patrón del proyecto original (inventario-app)
// para que las mutaciones offline funcionen igual:
//
//   - online (boolean): estado de navigator.onLine
//   - pending (number): cantidad de mutaciones en cola
//   - sincronizando (boolean): flush en curso
//   - flush(): intenta sincronizar la cola manualmente
//   - refrescarPending(): relee el contador desde IDB
//
// Al detectar cambio a online=true, dispara flush automáticamente.

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { useToast } from "./ToastContext";
import {
    getPendingCount,
} from "../lib/offlineDb";
import { flushQueue } from "../lib/offlineQueue";
import { useAuth } from "./AuthContext";
import { PERMISOS } from "../lib/authPermissions";

const NetworkContext = createContext(null);

export function NetworkProvider({ children }) {
    const toast = useToast();
    const { user, loading: authLoading, puede } = useAuth();
    const [online, setOnline] = useState(
        typeof navigator !== "undefined" ? navigator.onLine : true,
    );
    const [pending, setPending] = useState(0);
    const [sincronizando, setSincronizando] = useState(false);
    const flushingRef = useRef(false);

    const refrescarPending = useCallback(async () => {
        try {
            const n = await getPendingCount();
            setPending(n);
            return n;
        } catch {
            return 0;
        }
    }, []);

    const flush = useCallback(async () => {
        if (flushingRef.current) return { flushed: 0, failed: 0, skipped: 0 };
        if (!navigator.onLine) {
            return { flushed: 0, failed: 0, skipped: 0 };
        }
        if (authLoading || !user || !puede(PERMISOS.EQUIPOS)) {
            return { flushed: 0, failed: 0, skipped: 0 };
        }
        flushingRef.current = true;
        setSincronizando(true);
        try {
            const result = await flushQueue({ userId: user.id });
            await refrescarPending();
            if (result.flushed > 0) {
                toast.success(
                    `${result.flushed} cambio${
                        result.flushed === 1 ? "" : "s"
                    } sincronizado${result.flushed === 1 ? "" : "s"}.`,
                );
            }
            if (result.failed > 0) {
                toast.error(
                    `${result.failed} cambio${
                        result.failed === 1 ? "" : "s"
                    } no se pudieron sincronizar.`,
                );
            }
            return result;
        } catch (err) {
            console.error("[NetworkContext] flush falló:", err);
            return { flushed: 0, failed: 0, skipped: 0 };
        } finally {
            flushingRef.current = false;
            setSincronizando(false);
        }
    }, [authLoading, puede, refrescarPending, toast, user]);

    // Listeners online/offline
    useEffect(() => {
        const handleOnline = async () => {
            setOnline(true);
            toast.info("Conexión recuperada — sincronizando cambios…");
            await flush();
        };
        const handleOffline = () => {
            setOnline(false);
            toast.info(
                "Sin conexión — los cambios se guardarán localmente.",
            );
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // Lee el contador inicial y, si hay pendientes de una sesión
        // anterior y hay red, los sincroniza de inmediato. Antes solo
        // se flusheaba en el evento "online": si cerrabas la pestaña
        // con pendientes y volvías CON conexión, quedaban pegados.
        refrescarPending().then((n) => {
            if (
                n > 0 &&
                navigator.onLine &&
                !authLoading &&
                user &&
                puede(PERMISOS.EQUIPOS)
            ) {
                toast.info("Hay cambios pendientes — sincronizando…");
                flush();
            }
        });

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [authLoading, flush, puede, refrescarPending, toast, user]);

    const value = {
        online,
        pending,
        sincronizando,
        flush,
        refrescarPending,
    };

    return (
        <NetworkContext.Provider value={value}>
            {children}
        </NetworkContext.Provider>
    );
}

export function useNetwork() {
    const ctx = useContext(NetworkContext);
    if (!ctx) {
        throw new Error(
            "useNetwork debe usarse dentro de un <NetworkProvider>",
        );
    }
    return ctx;
}
