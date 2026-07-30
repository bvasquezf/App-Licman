import { Outlet } from "react-router-dom";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { AUTO_REFRESH_INTERVAL_MS, loadData, getCircuitState } from "../lib/dashboardData";
import {
    applyFilters,
    computeKpis,
    populateFilterOptions,
    resetFilters,
} from "../lib/dashboardAnalytics";
import { useToast } from "./ToastContext";

const DashboardContext = createContext(null);

const FUENTES = ["OT Taller", "Informe Terreno"];

export function DashboardProvider({ children }) {
    const toast = useToast();

    const [rawData, setRawData] = useState([]);
    const [filters, setFilters] = useState(() => resetFilters());
    const [loading, setLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [dataSource, setDataSource] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [serverTimestamp, setServerTimestamp] = useState(null);
    const [circuitState, setCircuitState] = useState({
        consecutiveErrors: 0,
        circuitOpenedAt: 0,
        isOpen: false,
    });
    const autoRefreshRef = useRef(null);

    /**
     * Recarga los datos. `manual: true` solo desde el botón Actualizar:
     * los toasts ("Datos actualizados…", fallback, errores) se muestran
     * SOLO en refresh manual — el auto-refresh de 2 min es silencioso
     * (antes spameaba un toast en cada tick, y errores repetidos si el
     * servidor estaba caído; el estado igual se ve en el badge/timestamp
     * del FilterBar).
     */
    const refresh = useCallback(
        async (force = false, { manual = false } = {}) => {
            setLoading(true);
            setLoadError(null);
            try {
                const result = await loadData({ force });
                if (result.skipped) return;
                if (result.data == null) {
                    setLoadError(result.error ?? "Sin datos");
                    return;
                }
                setRawData(result.data);
                setDataSource(result.source);
                setLastUpdate(new Date());
                setServerTimestamp(result.metadata?.serverTimestamp ?? null);
                if (manual) {
                    if (result.source === "fallback") {
                        toast.warning("Usando datos de respaldo locales");
                    } else {
                        toast.success(
                            `Datos actualizados: ${result.data.length} registros`,
                        );
                    }
                }
            } catch (err) {
                setLoadError(err?.message ?? "Error desconocido");
                if (manual) toast.error(err?.message ?? "Error al cargar datos");
            } finally {
                setLoading(false);
                setCircuitState(getCircuitState());
            }
        },
        [toast],
    );

    // Auto-refresh. SIN guard de rawData.length: antes, si la primera
    // carga fallaba, el tick nunca reintentaba y el dashboard quedaba
    // muerto hasta un refresh manual. El circuit breaker de loadData
    // ya frena los reintentos cuando el servidor sigue caído.
    useEffect(() => {
        function tick() {
            if (document.visibilityState === "visible") {
                refresh(true);
            }
        }
        autoRefreshRef.current = setInterval(tick, AUTO_REFRESH_INTERVAL_MS);
        return () => clearInterval(autoRefreshRef.current);
    }, [refresh]);

    // Primera carga
    useEffect(() => {
        refresh(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => applyFilters(rawData, filters), [rawData, filters]);

    const kpis = useMemo(() => computeKpis(filtered), [filtered]);

    const filterOptions = useMemo(
        () => populateFilterOptions(rawData),
        [rawData],
    );

    const setFilter = useCallback((key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    }, []);

    const clearFilters = useCallback(() => {
        setFilters(resetFilters());
        toast.info("Filtros limpiados");
    }, [toast]);

    const value = useMemo(
        () => ({
            rawData,
            filtered,
            filters,
            setFilter,
            clearFilters,
            loading,
            lastUpdate,
            dataSource,
            loadError,
            serverTimestamp,
            circuitState,
            refresh,
            kpis,
            filterOptions,
            fuentes: FUENTES,
        }),
        [
            rawData,
            filtered,
            filters,
            setFilter,
            clearFilters,
            loading,
            lastUpdate,
            dataSource,
            loadError,
            serverTimestamp,
            circuitState,
            refresh,
            kpis,
            filterOptions,
        ],
    );

    return (
        <DashboardContext.Provider value={value}>
            {children}
            <Outlet />
        </DashboardContext.Provider>
    );
}

export function useDashboard() {
    const ctx = useContext(DashboardContext);
    if (!ctx)
        throw new Error("useDashboard debe usarse dentro de <DashboardProvider>");
    return ctx;
}