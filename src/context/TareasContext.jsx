import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAsync } from "../hooks/useAsync";
import {
    cargarArchivoTareas,
    cargarCatalogosTareas,
    cargarPapeleraTareas,
    cargarTareasOperativas,
} from "../lib/tareasData";
import {
    guardarCacheTareasOperativas,
    leerCacheTareasOperativas,
} from "../lib/tareasCache";
import { PERMISOS } from "../lib/authPermissions";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

const INTERVALO_REFRESCO_MS = 60_000;

const DATOS_VACIOS = {
    tareas: [],
    eliminadas: [],
    tecnicos: [],
    clientes: [],
    equipos: [],
};

const TareasContext = createContext(null);

export function TareasProvider({ children }) {
    const toast = useToast();
    const location = useLocation();
    const { puede, profile } = useAuth();
    const perfilId = profile?.id ?? null;
    const incluirEliminadas =
        puede(PERMISOS.TAREAS_ELIMINAR) &&
        location.pathname === "/tareas/eliminadas";
    const incluirArchivo = [
        "/tareas/calendario",
        "/tareas/finalizadas",
    ].includes(location.pathname);
    const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
    // Cache IndexedDB (stale-while-revalidate): undefined = leyendo,
    // null = sin cache usable, array = última planificación guardada.
    const [cacheOperativas, setCacheOperativas] = useState(undefined);
    const actualizacionEnCursoRef = useRef(null);
    const ultimaActualizacionRef = useRef(null);
    // Cada carga exitosa refresca el cache local para la próxima visita.
    const cargarOperativas = useCallback(async () => {
        const resultado = await cargarTareasOperativas();
        void guardarCacheTareasOperativas(perfilId, resultado.tareas);
        return resultado;
    }, [perfilId]);
    const cargarCatalogos = useCallback(() => cargarCatalogosTareas(), []);
    const cargarArchivo = useCallback(() => cargarArchivoTareas(), []);
    const cargarPapelera = useCallback(() => cargarPapeleraTareas(), []);
    const {
        data: operativas,
        loading,
        error,
        refetch: ejecutarCargaOperativas,
    } = useAsync(cargarOperativas, {
        immediate: false,
        errorContexto: "cargar la planificación de tareas",
    });
    const {
        data: catalogos,
        loading: loadingCatalogos,
        error: errorCatalogos,
        refetch: ejecutarCargaCatalogos,
    } = useAsync(cargarCatalogos, {
        immediate: false,
        errorContexto: "cargar técnicos, clientes y equipos de Tareas",
    });
    const {
        data: archivo,
        loading: loadingArchivo,
        error: errorArchivo,
        refetch: ejecutarCargaArchivo,
    } = useAsync(cargarArchivo, {
        immediate: false,
        errorContexto: "cargar el archivo de Tareas",
    });
    const {
        data: eliminadas,
        loading: loadingPapelera,
        error: errorPapelera,
        refetch: ejecutarCargaPapelera,
    } = useAsync(cargarPapelera, {
        immediate: false,
        errorContexto: "cargar la papelera de Tareas",
    });

    useEffect(() => {
        if (!operativas) return;
        const momento = new Date();
        ultimaActualizacionRef.current = momento;
        setUltimaActualizacion(momento);
    }, [operativas]);

    const refetch = useCallback(() => {
        if (actualizacionEnCursoRef.current) {
            return actualizacionEnCursoRef.current;
        }
        const solicitud = ejecutarCargaOperativas();
        actualizacionEnCursoRef.current = solicitud;
        void solicitud.finally(() => {
            if (actualizacionEnCursoRef.current === solicitud) {
                actualizacionEnCursoRef.current = null;
            }
        });
        return solicitud;
    }, [ejecutarCargaOperativas]);

    useEffect(() => {
        void refetch();
    }, [refetch]);

    // Lee el cache local una vez por usuario. Si la red responde antes,
    // no pasa nada: la data fresca tiene precedencia en el merge.
    useEffect(() => {
        let vivo = true;
        leerCacheTareasOperativas(perfilId).then((tareas) => {
            if (vivo) setCacheOperativas(tareas ?? null);
        });
        return () => {
            vivo = false;
        };
    }, [perfilId]);

    // Catálogos en paralelo con las operativas. Antes esperaban a que
    // las operativas terminaran, así que la vista "Por técnico" y el
    // formulario de tarea tardaban el doble en quedar listos.
    useEffect(() => {
        void ejecutarCargaCatalogos();
    }, [ejecutarCargaCatalogos]);

    useEffect(() => {
        if (incluirEliminadas) void ejecutarCargaPapelera();
    }, [ejecutarCargaPapelera, incluirEliminadas]);

    useEffect(() => {
        if (incluirArchivo) void ejecutarCargaArchivo();
    }, [ejecutarCargaArchivo, incluirArchivo]);

    useEffect(() => {
        const actualizarSiCorresponde = () => {
            if (document.visibilityState === "visible") void refetch();
        };
        const intervalo = window.setInterval(
            actualizarSiCorresponde,
            INTERVALO_REFRESCO_MS,
        );
        return () => window.clearInterval(intervalo);
    }, [refetch]);

    useEffect(() => {
        const actualizarAlVolver = () => {
            if (document.visibilityState !== "visible") return;
            const ultima = ultimaActualizacionRef.current?.getTime() ?? 0;
            if (Date.now() - ultima >= 15_000) void refetch();
        };
        const actualizarAlRecuperarRed = () => void refetch();

        window.addEventListener("focus", actualizarAlVolver);
        window.addEventListener("online", actualizarAlRecuperarRed);
        document.addEventListener("visibilitychange", actualizarAlVolver);
        return () => {
            window.removeEventListener("focus", actualizarAlVolver);
            window.removeEventListener("online", actualizarAlRecuperarRed);
            document.removeEventListener("visibilitychange", actualizarAlVolver);
        };
    }, [refetch]);

    const actualizarManual = useCallback(async () => {
        const solicitudes = [refetch()];
        void ejecutarCargaCatalogos();
        if (incluirArchivo) solicitudes.push(ejecutarCargaArchivo());
        if (incluirEliminadas) solicitudes.push(ejecutarCargaPapelera());
        const resultados = await Promise.all(solicitudes);
        if (resultados.every(Boolean)) {
            toast.success("Planificación actualizada");
            return true;
        }
        toast.error("No se pudo actualizar la planificación");
        return false;
    }, [
        ejecutarCargaArchivo,
        ejecutarCargaCatalogos,
        ejecutarCargaPapelera,
        incluirArchivo,
        incluirEliminadas,
        refetch,
        toast,
    ]);

    const refetchVisible = useCallback(async () => {
        const solicitudes = [refetch()];
        if (incluirArchivo) solicitudes.push(ejecutarCargaArchivo());
        if (incluirEliminadas) solicitudes.push(ejecutarCargaPapelera());
        const resultados = await Promise.all(solicitudes);
        return resultados.every(Boolean) ? resultados[0] : null;
    }, [
        ejecutarCargaArchivo,
        ejecutarCargaPapelera,
        incluirArchivo,
        incluirEliminadas,
        refetch,
    ]);

    // Mientras la red no responde, se muestra el cache local (SWR); cuando
    // llega la data fresca, esta reemplaza al cache en pantalla.
    const operativasEfectivas = useMemo(
        () =>
            operativas ??
            (Array.isArray(cacheOperativas)
                ? { tareas: cacheOperativas }
                : undefined),
        [operativas, cacheOperativas],
    );

    const data = useMemo(() => {
        const tareasPorId = new Map(
            [
                ...(operativasEfectivas?.tareas ?? []),
                ...(incluirArchivo ? archivo ?? [] : []),
            ].map((tarea) => [tarea.id, tarea]),
        );
        return {
            ...DATOS_VACIOS,
            ...(operativasEfectivas ?? {}),
            ...(catalogos ?? {}),
            tareas: [...tareasPorId.values()],
            eliminadas: incluirEliminadas ? eliminadas ?? [] : [],
        };
    }, [archivo, catalogos, eliminadas, incluirArchivo, incluirEliminadas, operativasEfectivas]);

    const value = useMemo(
        () => ({
            data,
            loading: loading || (!operativasEfectivas && !error),
            operativasCargadas:
                operativas !== undefined || Array.isArray(cacheOperativas),
            loadingCatalogos:
                loadingCatalogos || (!catalogos && !errorCatalogos),
            catalogosCargados: catalogos !== undefined,
            loadingPapelera:
                incluirEliminadas &&
                (loadingPapelera || (!eliminadas && !errorPapelera)),
            papeleraCargada: eliminadas !== undefined,
            loadingArchivo:
                incluirArchivo &&
                (loadingArchivo || (!archivo && !errorArchivo)),
            archivoCargado: archivo !== undefined,
            error:
                error ??
                (incluirEliminadas ? errorPapelera : null) ??
                (incluirArchivo ? errorArchivo : null),
            errorOperativas: error,
            errorArchivo,
            errorPapelera,
            errorCatalogos,
            refetch: refetchVisible,
            actualizarManual,
            ultimaActualizacion,
        }),
        [
            actualizarManual,
            archivo,
            catalogos,
            data,
            error,
            errorArchivo,
            errorCatalogos,
            errorPapelera,
            eliminadas,
            incluirEliminadas,
            incluirArchivo,
            loading,
            loadingArchivo,
            loadingCatalogos,
            loadingPapelera,
            cacheOperativas,
            operativas,
            operativasEfectivas,
            refetchVisible,
            ultimaActualizacion,
        ],
    );

    return (
        <TareasContext.Provider value={value}>
            {children}
            <Outlet />
        </TareasContext.Provider>
    );
}

export function useTareas() {
    const context = useContext(TareasContext);
    if (!context) {
        throw new Error("useTareas debe usarse dentro de <TareasProvider>");
    }
    return context;
}
