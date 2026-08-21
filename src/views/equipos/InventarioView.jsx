import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
    BODEGA_EN_CLIENTE,
    usaBateriaElectrica,
} from "../../lib/equiposConstants";
import ConfirmDialog from "../../components/equipos/ConfirmDialog";
import MovimientoDialog from "../../components/equipos/MovimientoDialog";
import MovimientoHistorialModal from "../../components/equipos/MovimientoHistorialModal";
import EstadoDialog from "../../components/equipos/EstadoDialog";
import BateriaDialog from "../../components/equipos/BateriaDialog";
import EquiposHeader from "../../components/equipos/EquiposHeader";
import ResumenBodegas from "../../components/equipos/ResumenBodegas";
import { TablaEquipos } from "../../components/equipos/InventarioTabla";
import CrearClienteForm from "../../components/equipos/CrearClienteForm";
import Skeleton from "../../components/ui/Skeleton";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { useToast } from "../../context/ToastContext";
import { useNetwork } from "../../context/NetworkContext";
import {
    useModalTransition,
    useRetainedValue,
} from "../../hooks/useModalTransition";
import { supabase } from "../../services/supabase";
import {
    deleteFotoEquipo,
    getFotoUrlCached,
    uploadFotoEquipo,
} from "../../lib/equiposStorage";
import { parseFaltantes } from "../../lib/equiposPresentacion";
import {
    cacheEquipos,
    enqueuePendingWrite,
    getCachedEquipos,
} from "../../lib/offlineDb";

// Cantidad de cards por página en el inventario. Mobile-first: 20
// mantiene un scroll razonable sin saturar la pantalla.
const ITEMS_POR_PAGINA = 20;

const CAMPOS_ORDEN_VALIDOS = new Set([
    "recientes",
    "numero_interno",
    "tipo_equipo",
    "estado_operacional",
    "ubicacion",
    "horometro",
    "faltantes",
]);

const FILTROS_INVENTARIO = [
    { id: "todos", icono: "", label: "Todos", color: "slate" },
    { id: "disponibles", icono: "✅", label: "Disponibles", color: "green" },
    { id: "reparacion", icono: "🛠️", label: "En reparación", color: "red" },
    { id: "con_faltantes", icono: "🧩", label: "Con faltantes", color: "amber" },
    { id: "sin_bateria", icono: "🔋", label: "Sin batería", color: "cyan" },
    { id: "retorno", icono: "↩️", label: "Retorno pendiente", color: "violet" },
];

const VISTAS_VALIDAS = new Set(
    FILTROS_INVENTARIO.filter((filtro) => filtro.id !== "todos").map(
        (filtro) => filtro.id,
    ),
);

const CLASES_FILTRO = {
    slate: {
        activo: "border-slate-700 bg-slate-900 text-white",
        inactivo:
            "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200 dark:hover:bg-white/10",
    },
    green: {
        activo: "border-green-700 bg-green-600 text-white",
        inactivo:
            "border-green-300 bg-green-50 text-green-800 hover:bg-green-100 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20",
    },
    red: {
        activo: "border-red-700 bg-red-600 text-white",
        inactivo:
            "border-red-300 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20",
    },
    amber: {
        activo: "border-amber-700 bg-amber-600 text-white",
        inactivo:
            "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20",
    },
    cyan: {
        activo: "border-cyan-700 bg-cyan-600 text-white",
        inactivo:
            "border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-cyan-500/20",
    },
    violet: {
        activo: "border-violet-700 bg-violet-600 text-white",
        inactivo:
            "border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20",
    },
};

const CAMPOS_BUSQUEDA = [
    "numero_interno",
    "numero_serie",
    "marca",
    "modelo",
    "tipo_equipo",
    "responsable",
    "ubicacion_actual",
    "bateria",
    "bateria_serie",
];

/**
 * Genera la lista de números de página a mostrar, con ellipsis
 * cuando hay muchas páginas.
 */
function generarPaginas(actual, total) {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const paginas = [1];
    const inicio = Math.max(2, actual - 1);
    const fin = Math.min(total - 1, actual + 1);
    if (inicio > 2) paginas.push("…");
    for (let i = inicio; i <= fin; i++) paginas.push(i);
    if (fin < total - 1) paginas.push("…");
    paginas.push(total);
    return paginas;
}

function Paginacion({ pagina, totalPaginas, desde, hasta, total, onCambiar }) {
    const paginas = generarPaginas(pagina, totalPaginas);
    const hayAnterior = pagina > 1;
    const haySiguiente = pagina < totalPaginas;

    return (
        <nav
            className="mt-4 flex flex-col items-center gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-between dark:border-white/10"
            aria-label="Paginación del inventario"
        >
            <p className="text-[0.78rem] font-medium text-slate-600 tabular-nums dark:text-neutral-400">
                Mostrando <strong className="text-slate-900 dark:text-slate-100">{desde}</strong>–
                <strong className="text-slate-900 dark:text-slate-100">{hasta}</strong> de{" "}
                <strong className="text-slate-900 dark:text-slate-100">{total}</strong>
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => onCambiar(pagina - 1)}
                    disabled={!hayAnterior}
                    className="min-h-[44px] rounded-lg border-[1.5px] border-slate-300 bg-white px-2.5 py-1.5 text-[0.78rem] font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200 dark:hover:bg-white/10"
                >
                    ← Anterior
                </button>
                {paginas.map((p, i) =>
                    p === "…" ? (
                        <span
                            key={`ellipsis-${i}`}
                            className="px-1 text-[0.78rem] font-bold text-slate-400 dark:text-neutral-500"
                            aria-hidden
                        >
                            …
                        </span>
                    ) : (
                        <button
                            key={p}
                            type="button"
                            onClick={() => onCambiar(p)}
                            aria-current={p === pagina ? "page" : undefined}
                            className={`min-h-[44px] min-w-[44px] rounded-lg border-[1.5px] px-2 py-1.5 text-[0.78rem] font-bold tabular-nums transition ${
                                p === pagina
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200 dark:hover:bg-white/10"
                            }`}
                        >
                            {p}
                        </button>
                    ),
                )}
                <button
                    type="button"
                    onClick={() => onCambiar(pagina + 1)}
                    disabled={!haySiguiente}
                    className="min-h-[44px] rounded-lg border-[1.5px] border-slate-300 bg-white px-2.5 py-1.5 text-[0.78rem] font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200 dark:hover:bg-white/10"
                >
                    Siguiente →
                </button>
            </div>
        </nav>
    );
}

function cumpleFiltroBodega(equipo, filtroBodega) {
    if (filtroBodega === "todas") return true;
    if (filtroBodega === BODEGA_EN_CLIENTE) return Boolean(equipo.cliente_id);
    return equipo.bodega === filtroBodega;
}

function cumpleVistaRapida(equipo, vista, filtroBodega = "todas") {
    switch (vista) {
        case "disponibles":
            // Dentro del ámbito "En cliente", este chip representa los
            // equipos actualmente asignados en arriendo/préstamo, no los
            // disponibles físicamente en una bodega Licman.
            if (filtroBodega === BODEGA_EN_CLIENTE) {
                return Boolean(equipo.cliente_id && !equipo.vendido);
            }
            return Boolean(
                equipo.bodega &&
                    !equipo.cliente_id &&
                    !equipo.cliente_retorno_id &&
                    !equipo.vendido &&
                    equipo.estado_operacional === "Operativo",
            );
        case "reparacion":
            return Boolean(
                equipo.cliente_retorno_id ||
                    equipo.estado_operacional === "Inoperativo",
            );
        case "retorno":
            return Boolean(equipo.cliente_retorno_id);
        case "con_faltantes":
            return parseFaltantes(equipo.elementos_faltantes).length > 0;
        case "sin_bateria":
            return usaBateriaElectrica(equipo) && !equipo.bateria_asociada;
        default:
            return true;
    }
}

function InventarioSkeleton() {
    return (
        <div className="mt-4" aria-label="Cargando inventario" aria-busy="true">
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 lg:block dark:border-white/10">
                <div className="grid grid-cols-[13%_25%_26%_1fr_120px] gap-3 bg-slate-50 px-3 py-3 dark:bg-carbon-800">
                    {Array.from({ length: 5 }, (_, index) => (
                        <Skeleton key={index} className="h-4" />
                    ))}
                </div>
                {Array.from({ length: 6 }, (_, index) => (
                    <div
                        key={index}
                        className="grid grid-cols-[13%_25%_26%_1fr_120px] items-center gap-3 border-t border-slate-100 px-3 py-4 dark:border-white/5"
                    >
                        <Skeleton className="h-7" />
                        <Skeleton className="h-11" />
                        <Skeleton className="h-9" />
                        <Skeleton className="h-7" />
                        <div className="flex gap-2">
                            <Skeleton className="h-11 w-11 rounded-full" />
                            <Skeleton className="h-11 w-11 rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
                {Array.from({ length: 6 }, (_, index) => (
                    <div
                        key={index}
                        className="rounded-2xl border border-slate-200 p-4 dark:border-white/10"
                    >
                        <div className="flex justify-between gap-4">
                            <Skeleton className="h-8 w-28" />
                            <Skeleton className="h-4 w-14" />
                        </div>
                        <Skeleton className="mt-3 h-5 w-3/4" />
                        <Skeleton className="mt-2 h-4 w-1/2" />
                        <div className="mt-4 flex gap-2">
                            <Skeleton className="h-8 w-24 rounded-full" />
                            <Skeleton className="h-8 w-32 rounded-full" />
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                            <Skeleton className="h-11" />
                            <Skeleton className="h-11" />
                            <Skeleton className="h-11" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Vista principal de inventario de equipos.
 * Coordina cache, Supabase y acciones con soporte offline. La tabla,
 * ficha y edición visual viven en InventarioTabla.
 */
export default function InventarioView() {
    const toast = useToast();
    const { online, refrescarPending } = useNetwork();
    const [searchParams, setSearchParams] = useSearchParams();

    const [equipos, setEquipos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [confirmId, setConfirmId] = useState(null);
    const [movimientoEquipo, setMovimientoEquipo] = useState(null);
    const [historialEquipo, setHistorialEquipo] = useState(null);
    // Equipo al que se le está cambiando el estado operacional (EstadoDialog).
    const [estadoEquipo, setEstadoEquipo] = useState(null);
    const [bateriaEquipo, setBateriaEquipo] = useState(null);
    const [fotoModalPath, setFotoModalPath] = useState(null);
    // Modal hermano para crear cliente desde el dialog de movimiento.
    const [crearClienteAbierto, setCrearClienteAbierto] = useState(false);

    const busqueda = searchParams.get("q") ?? "";
    const filtroBodega = searchParams.get("bodega") || "todas";
    const paginaLeida = Number.parseInt(searchParams.get("pagina") ?? "1", 10);
    const pagina = Number.isFinite(paginaLeida) && paginaLeida > 0 ? paginaLeida : 1;
    const ordenLeido = searchParams.get("orden") ?? "recientes";
    const ordenCampo = CAMPOS_ORDEN_VALIDOS.has(ordenLeido)
        ? ordenLeido
        : "recientes";
    const ordenDireccion = searchParams.get("direccion") === "asc" ? "asc" : "desc";
    const vistaLeida = searchParams.get("vista") ?? "";
    const vistaRapida = VISTAS_VALIDAS.has(vistaLeida) ? vistaLeida : "";

    const actualizarParametros = useCallback(
        (cambios) => {
            setSearchParams(
                (anteriores) => {
                    const siguientes = new URLSearchParams(anteriores);
                    for (const [clave, valor] of Object.entries(cambios)) {
                        if (valor === null || valor === undefined || valor === "") {
                            siguientes.delete(clave);
                        } else {
                            siguientes.set(clave, String(valor));
                        }
                    }
                    return siguientes;
                },
                { replace: true },
            );
        },
        [setSearchParams],
    );

    const cambiarBusqueda = useCallback(
        (valor) => actualizarParametros({ q: valor, pagina: null }),
        [actualizarParametros],
    );
    const cambiarBodega = useCallback(
        (valor) =>
            actualizarParametros({
                bodega: valor === "todas" ? null : valor,
                pagina: null,
            }),
        [actualizarParametros],
    );
    const cambiarPagina = useCallback(
        (valor) => actualizarParametros({ pagina: valor > 1 ? valor : null }),
        [actualizarParametros],
    );

    const ordenarPor = useCallback(
        (campo) => {
            const direccionInicial = ["recientes", "horometro", "faltantes"].includes(
                campo,
            )
                ? "desc"
                : "asc";
            const siguienteDireccion =
                ordenCampo === campo
                    ? ordenDireccion === "asc"
                        ? "desc"
                        : "asc"
                    : direccionInicial;
            actualizarParametros({
                orden: campo === "recientes" ? null : campo,
                direccion:
                    campo === "recientes" && siguienteDireccion === "desc"
                        ? null
                        : siguienteDireccion,
                pagina: null,
            });
        },
        [actualizarParametros, ordenCampo, ordenDireccion],
    );

    const cargar = async () => {
        setCargando(true);
        try {
            // 1. Cache primero
            const cached = await getCachedEquipos();
            if (cached.length > 0) setEquipos(cached);

            // 2. Datos frescos si hay red
            if (supabase && navigator.onLine) {
                const [equiposResponse, bateriasResponse] = await Promise.all([
                    supabase
                        .from("equipos")
                        .select("*")
                        .order("correlativo", { ascending: true }),
                    supabase
                        .from("baterias")
                        .select("id, equipo_id, numero_interno, numero_serie")
                        .not("equipo_id", "is", null),
                ]);
                const { data, error } = equiposResponse;
                if (error) {
                    if (cached.length === 0) toast.error(error.message);
                } else {
                    const bateriasByEquipo = new Map(
                        (bateriasResponse.data ?? []).map((bateria) => [
                            bateria.equipo_id,
                            bateria,
                        ]),
                    );
                    const equiposConBateria = (data ?? []).map((equipo) => ({
                        ...equipo,
                        bateria_asociada:
                            bateriasByEquipo.get(equipo.id) ?? null,
                    }));
                    setEquipos(equiposConBateria);
                    await cacheEquipos(equiposConBateria);
                }

                // Carga paralela de clientes activos (catálogo pequeño ~150).
                // Se usa para resolver nombres en cards y como options del
                // dropdown del MovimientoDialog.
                const { data: cliData } = await supabase
                    .from("clientes")
                    .select("id, razon_social")
                    .eq("activo", true)
                    .order("razon_social");
                setClientes(cliData ?? []);
            }
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Activos (excluir papelera). Lo siguen usando los filtros rápidos
    // y los conteos de los chips internos de "Inventario registrado".
    const equiposActivos = useMemo(
        () => equipos.filter((e) => !e.deleted_at),
        [equipos],
    );

    // Map id → cliente, para resolver nombres en cards y badges.
    const clientesById = useMemo(() => {
        const map = new Map();
        for (const c of clientes) map.set(c.id, c);
        return map;
    }, [clientes]);

    const conteosVistas = useMemo(
        () => {
            const base = equiposActivos.filter((equipo) =>
                cumpleFiltroBodega(equipo, filtroBodega),
            );
            return Object.fromEntries(
                FILTROS_INVENTARIO.map((filtro) => [
                    filtro.id,
                    filtro.id === "todos"
                        ? base.length
                        : base.filter((equipo) =>
                              cumpleVistaRapida(
                                  equipo,
                                  filtro.id,
                                  filtroBodega,
                              ),
                          ).length,
                ]),
            );
        },
        [equiposActivos, filtroBodega],
    );

    const duplicados = useMemo(() => {
        const counts = {};
        for (const e of equiposActivos) {
            if (e.numero_interno && e.bodega) {
                const key = `${e.bodega}|${e.numero_interno}`;
                counts[key] = (counts[key] || 0) + 1;
            }
        }
        return new Set(Object.keys(counts).filter((k) => counts[k] > 1));
    }, [equiposActivos]);

    const equiposFiltrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        return equiposActivos.filter((e) => {
            // Filtro de ubicación: bodega específica, "todas", o "En cliente"
            if (!cumpleFiltroBodega(e, filtroBodega)) return false;
            if (!cumpleVistaRapida(e, vistaRapida, filtroBodega)) return false;
            if (!texto) return true;
            return [
                ...CAMPOS_BUSQUEDA.map((campo) => e[campo]),
                e.bateria_asociada?.numero_interno,
                e.bateria_asociada?.numero_serie,
                clientesById.get(e.cliente_id)?.razon_social,
                clientesById.get(e.cliente_retorno_id)?.razon_social,
            ].some((valor) =>
                String(valor ?? "").toLowerCase().includes(texto),
            );
        });
    }, [
        equiposActivos,
        busqueda,
        filtroBodega,
        vistaRapida,
        clientesById,
    ]);

    // Orden aplicado DESPUÉS de filtrar y ANTES de paginar.
    const equiposOrdenados = useMemo(() => {
        const lista = [...equiposFiltrados];
        const cmpTexto = (a, b) =>
            String(a ?? "").localeCompare(String(b ?? ""), "es", {
                sensitivity: "base",
            });
        const multiplicador = ordenDireccion === "asc" ? 1 : -1;
        const ubicacionDe = (equipo) =>
            clientesById.get(equipo.cliente_id)?.razon_social ??
            equipo.bodega ??
            equipo.ubicacion_actual ??
            "";
        const estadoValor = {
            Operativo: 0,
            "Operativo con observaciones": 1,
            Inoperativo: 2,
        };
        const compararNumeroConVaciosAlFinal = (a, b) => {
            const aVacio = a === null || a === undefined || a === "";
            const bVacio = b === null || b === undefined || b === "";
            if (aVacio && bVacio) return 0;
            if (aVacio) return 1;
            if (bVacio) return -1;
            return (Number(a) - Number(b)) * multiplicador;
        };

        lista.sort((a, b) => {
            let diferencia = 0;
            switch (ordenCampo) {
                case "numero_interno":
                    diferencia = String(a.numero_interno ?? "").localeCompare(
                        String(b.numero_interno ?? ""),
                        "es",
                        { numeric: true, sensitivity: "base" },
                    );
                    break;
                case "tipo_equipo":
                    diferencia =
                        cmpTexto(a.tipo_equipo, b.tipo_equipo) ||
                        cmpTexto(a.marca, b.marca) ||
                        cmpTexto(a.modelo, b.modelo);
                    break;
                case "estado_operacional":
                    diferencia =
                        (estadoValor[a.estado_operacional] ?? 99) -
                        (estadoValor[b.estado_operacional] ?? 99);
                    break;
                case "ubicacion":
                    diferencia = cmpTexto(ubicacionDe(a), ubicacionDe(b));
                    break;
                case "horometro":
                    diferencia = compararNumeroConVaciosAlFinal(
                        a.horometro,
                        b.horometro,
                    );
                    if (diferencia !== 0) return diferencia;
                    break;
                case "faltantes":
                    diferencia =
                        parseFaltantes(a.elementos_faltantes).length -
                        parseFaltantes(b.elementos_faltantes).length;
                    break;
                case "recientes":
                default:
                    diferencia = (a.correlativo ?? 0) - (b.correlativo ?? 0);
            }

            if (diferencia !== 0) return diferencia * multiplicador;
            return (b.correlativo ?? 0) - (a.correlativo ?? 0);
        });
        return lista;
    }, [equiposFiltrados, clientesById, ordenCampo, ordenDireccion]);

    const filtrosInventario = useMemo(
        () =>
            FILTROS_INVENTARIO.map((filtro) => {
                if (filtroBodega !== BODEGA_EN_CLIENTE) return filtro;
                if (filtro.id === "disponibles") {
                    return {
                        ...filtro,
                        icono: "🏢",
                        label: "En arriendo",
                    };
                }
                if (filtro.id === "sin_bateria") {
                    return {
                        ...filtro,
                        label: "Batería por asociar",
                    };
                }
                return filtro;
            }),
        [filtroBodega],
    );

    const totalPaginas = Math.max(
        1,
        Math.ceil(equiposOrdenados.length / ITEMS_POR_PAGINA),
    );

    useEffect(() => {
        if (pagina > totalPaginas) cambiarPagina(totalPaginas);
    }, [cambiarPagina, pagina, totalPaginas]);

    const equiposPaginados = useMemo(() => {
        const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
        return equiposOrdenados.slice(inicio, inicio + ITEMS_POR_PAGINA);
    }, [equiposOrdenados, pagina]);

    const rangoActual = useMemo(() => {
        if (equiposOrdenados.length === 0) return { desde: 0, hasta: 0 };
        const desde = (pagina - 1) * ITEMS_POR_PAGINA + 1;
        const hasta = Math.min(
            pagina * ITEMS_POR_PAGINA,
            equiposOrdenados.length,
        );
        return { desde, hasta };
    }, [equiposOrdenados.length, pagina]);

    const equipoAEliminar = equipos.find((e) => e.id === confirmId);

    const handleConfirmarEliminar = async () => {
        if (!confirmId) return;
        const id = confirmId;
        try {
            if (!online) {
                await enqueuePendingWrite({
                    type: "soft_delete",
                    payload: { id },
                });
                await refrescarPending();
                toast.info("Sin conexión — eliminado en cola, se sincronizará al reconectar.");
            } else {
                const { error } = await supabase.rpc(
                    "soft_delete_equipo",
                    { p_id: id },
                );
                if (error) throw error;
                toast.success("Equipo eliminado");
            }
            setEquipos((prev) =>
                prev.map((e) =>
                    e.id === id ? { ...e, deleted_at: new Date().toISOString() } : e,
                ),
            );
        } catch (err) {
            toast.error(err?.message ?? "No se pudo eliminar");
        } finally {
            setConfirmId(null);
        }
    };

    const handleActualizarDatos = async (payload) => {
        if (!online) {
            toast.warning(
                "Sin conexión: la edición no se puede guardar. Espera a tener red.",
            );
            return null;
        }

        try {
            const { data, error } = await supabase.rpc("actualizar_equipo", {
                p_id: payload.id,
                p_equipo: payload,
            });
            if (error) throw error;

            const actualizado = Array.isArray(data) ? data[0] : data;
            if (!actualizado) throw new Error("Supabase no devolvió el equipo actualizado");

            const anterior = equipos.find((equipo) => equipo.id === actualizado.id);
            const actualizadoConBateria = {
                ...actualizado,
                bateria_asociada: anterior?.bateria_asociada ?? null,
            };

            const siguiente = equipos.map((equipo) =>
                equipo.id === actualizado.id ? actualizadoConBateria : equipo,
            );
            setEquipos(siguiente);
            await cacheEquipos(siguiente);
            toast.success("Datos del equipo actualizados");
            return actualizadoConBateria;
        } catch (err) {
            toast.error(err?.message ?? "No se pudieron actualizar los datos");
            throw err;
        }
    };

    /**
     * Movimiento simple: una sola llamada al RPC.
     * Offline-capable (siempre que no haya foto nueva adjunta).
     */
    const handleRegistrarMovimientoSimple = async (payload) => {
        let nuevaFotoUrl = null;
        let movimientoConfirmado = false;
        try {
            // Si hay foto nueva adjunta pero no hay red, no podemos subirla
            // a Storage. Bloqueamos.
            if (payload.fotoFile && !online) {
                toast.warning(
                    "Sin conexión: no se puede subir la foto. Quítala o espera a tener red.",
                );
                return;
            }

            if (!online) {
                // Offline sin foto → encolar
                await enqueuePendingWrite({
                    type: "movimiento",
                    payload: serializarPayloadMovimiento(payload),
                });
                await refrescarPending();
                toast.info("Sin conexión — movimiento en cola, se sincronizará al reconectar.");
            } else {
                // 1. Si hay foto nueva, subir a Storage. La foto VIEJA no
                // se borra aquí: si el RPC falla, el equipo seguiría
                // apuntando a un archivo eliminado. Se borra después,
                // solo si el movimiento quedó registrado.
                nuevaFotoUrl = await subirFotoSiHay(payload);
                if (nuevaFotoUrl === "ERROR") return; // toast ya emitido

                // 2. Registrar el movimiento
                const { error } = await supabase.rpc(
                    "registrar_movimiento",
                    {
                        p_equipo_id: payload.equipo_id,
                        p_motivo: payload.motivo,
                        p_bodega_destino: payload.bodega_destino ?? null,
                        p_responsable: payload.responsable,
                        p_bodega_origen: payload.bodega_origen ?? null,
                        p_cliente_origen_id:
                            payload.cliente_origen_id ?? null,
                        p_cliente_destino_id:
                            payload.cliente_destino_id ?? null,
                        p_ubicacion_origen: payload.ubicacion_origen ?? null,
                        p_ubicacion_destino:
                            payload.ubicacion_destino ?? null,
                        p_notas: payload.notas ?? null,
                        p_horometro: payload.horometro,
                        p_numero_acta: payload.numero_acta ?? null,
                        p_numero_guia_despacho:
                            payload.numero_guia_despacho ?? null,
                        p_foto_url: nuevaFotoUrl,
                        p_categoria: payload.categoria ?? null,
                        p_destino_externo: payload.destino_externo ?? null,
                    },
                );
                if (error) throw error;
                movimientoConfirmado = true;
                // RPC OK → recién ahora se borra la foto anterior
                await borrarFotoAnterior(payload);
                toast.success(
                    nuevaFotoUrl
                        ? "Movimiento registrado · foto actualizada"
                        : "Movimiento registrado",
                );
            }
            setMovimientoEquipo(null);
            cargar();
        } catch (err) {
            if (nuevaFotoUrl && !movimientoConfirmado) {
                await borrarFotoNueva(nuevaFotoUrl);
            }
            toast.error(err?.message ?? "No se pudo registrar el movimiento");
        }
    };

    /**
     * Swap (cambio de equipo bidireccional).
     * El RPC guarda ambas piernas en una sola transacción. Funciona tanto
     * desde el reemplazante en bodega como desde el equipo que está en cliente.
     */
    const handleRegistrarSwap = async (payload) => {
        if (!online) {
            toast.warning(
                "Los cambios de equipo requieren conexión. Espera a tener red.",
            );
            return;
        }

        let nuevaFotoUrl = null;
        let cambioConfirmado = false;
        try {
            // La foto corresponde al equipo desde cuya ficha se abrió el
            // diálogo, aunque ese equipo sea el que vuelve desde el cliente.
            nuevaFotoUrl = await subirFotoSiHay(payload);
            if (nuevaFotoUrl === "ERROR") return;

            const desdeCliente = Boolean(
                payload.cliente_origen_id && !payload.bodega_origen,
            );
            const equipoSalidaId = desdeCliente
                ? payload.equipo_recibe_id
                : payload.equipo_id;
            const equipoVuelveId = desdeCliente
                ? payload.equipo_id
                : payload.equipo_recibe_id;
            const clienteId = desdeCliente
                ? payload.cliente_origen_id
                : payload.cliente_destino_id;
            const horometroSalida = desdeCliente
                ? payload.horometro_recibe
                : payload.horometro;
            const horometroVuelve = desdeCliente
                ? payload.horometro
                : payload.horometro_recibe;

            const { error } = await supabase.rpc(
                "registrar_cambio_equipo",
                {
                    p_equipo_salida_id: equipoSalidaId,
                    p_equipo_vuelve_id: equipoVuelveId,
                    p_cliente_id: clienteId,
                    p_bodega_retorno: payload.bodega_recibe_destino,
                    p_responsable: payload.responsable,
                    p_categoria: payload.categoria,
                    p_ubicacion_cliente:
                        payload.ubicacion_destino ?? null,
                    p_ubicacion_bodega: payload.ubicacion_retorno ?? null,
                    p_notas: payload.notas ?? null,
                    p_horometro_salida: horometroSalida,
                    p_horometro_vuelve: horometroVuelve,
                    p_numero_acta_salida:
                        payload.numero_acta_salida ?? null,
                    p_numero_guia_despacho_salida:
                        payload.numero_guia_despacho_salida ?? null,
                    p_numero_acta_vuelve:
                        payload.numero_acta_vuelve ?? null,
                    p_numero_guia_despacho_vuelve:
                        payload.numero_guia_despacho_vuelve ?? null,
                    p_foto_url_salida: desdeCliente ? null : nuevaFotoUrl,
                    p_foto_url_vuelve: desdeCliente ? nuevaFotoUrl : null,
                },
            );
            if (error) throw error;
            cambioConfirmado = true;
            await borrarFotoAnterior(payload);
            toast.success("Cambio de equipo registrado");

            setMovimientoEquipo(null);
            await cargar();
        } catch (err) {
            if (nuevaFotoUrl && !cambioConfirmado) {
                await borrarFotoNueva(nuevaFotoUrl);
            }
            toast.error(err?.message ?? "No se pudo registrar el cambio");
        }
    };

    const handleCambiarBateria = async (payload) => {
        if (!online) {
            toast.warning(
                "Sin conexión: el cambio de batería requiere conexión para mantener el inventario sincronizado.",
            );
            return false;
        }

        try {
            const { error } = await supabase.rpc("cambiar_bateria_equipo", payload);
            if (error) throw error;
            toast.success("Cambio de batería registrado");
            setBateriaEquipo(null);
            await cargar();
            return true;
        } catch (error) {
            toast.error(error?.message ?? "No se pudo registrar el cambio de batería");
            return false;
        }
    };

    /**
     * Sube la foto nueva al bucket dentro de la carpeta del equipo. NO borra la anterior: eso lo hace
     * `borrarFotoAnterior` solo después de que el RPC confirma el
     * movimiento (si el RPC falla, el equipo sigue apuntando a un
     * archivo que existe).
     *
     * Retorna el path nuevo, null si no había foto, o la string "ERROR"
     * si falló (en cuyo caso ya se emitió un toast).
     */
    const subirFotoSiHay = async (payload) => {
        if (!payload.fotoFile) return null;
        try {
            return await uploadFotoEquipo(
                payload.fotoFile,
                payload.equipo_id,
            );
        } catch (uploadErr) {
            toast.error(
                "No se pudo subir la foto: " +
                    (uploadErr?.message ?? "error desconocido"),
            );
            return "ERROR";
        }
    };

    /**
     * Borra (best-effort) la foto anterior del equipo tras un movimiento
     * exitoso con foto nueva. Si el borrado falla queda un huérfano en
     * el bucket — molesto pero inofensivo; jamás bloquea el flujo.
     */
    const borrarFotoAnterior = async (payload) => {
        if (!payload.oldFotoUrl) return;
        try {
            await deleteFotoEquipo(payload.oldFotoUrl);
        } catch {
            console.warn(
                `[InventarioView] No se pudo borrar foto anterior ${payload.oldFotoUrl}`,
            );
        }
    };

    /**
     * Limpia la foto recién subida si el RPC del movimiento no confirmó.
     * Así un error de red o validación no deja archivos huérfanos.
     */
    const borrarFotoNueva = async (path) => {
        try {
            await deleteFotoEquipo(path);
        } catch {
            console.warn(`[InventarioView] No se pudo limpiar foto nueva ${path}`);
        }
    };

    /**
     * Serializa un payload de movimiento simple para encolar en IDB.
     * No guarda binarios (fotoFile) ni referencias a File.
     */
    const serializarPayloadMovimiento = (payload) => ({
        equipo_id: payload.equipo_id,
        bodega_origen: payload.bodega_origen ?? null,
        bodega_destino: payload.bodega_destino ?? null,
        cliente_origen_id: payload.cliente_origen_id ?? null,
        cliente_destino_id: payload.cliente_destino_id ?? null,
        ubicacion_origen: payload.ubicacion_origen ?? null,
        ubicacion_destino: payload.ubicacion_destino ?? null,
        motivo: payload.motivo,
        responsable: payload.responsable,
        notas: payload.notas ?? null,
        horometro: payload.horometro ?? null,
        numero_acta: payload.numero_acta ?? null,
        numero_guia_despacho: payload.numero_guia_despacho ?? null,
        categoria: payload.categoria ?? null,
        destino_externo: payload.destino_externo ?? null,
        p_foto_url: null, // bloqueado si había foto
    });

    /**
     * Cambio de estado operacional (RPC `actualizar_estado_equipo`).
     * Requiere conexión: no se encola (el RPC hace update + log de
     * movimiento en una sola transacción).
     */
    const handleActualizarEstado = async ({
        id,
        estado,
        horometro,
        responsable,
        notas,
    }) => {
        if (!online) {
            toast.warning(
                "Sin conexión: el cambio de estado no se puede encolar. Espera a tener red.",
            );
            return;
        }
        try {
            const { error } = await supabase.rpc("actualizar_estado_equipo", {
                p_id: id,
                p_estado: estado,
                p_horometro: horometro,
                p_responsable: responsable,
                p_notas: notas ?? null,
            });
            if (error) throw error;
            toast.success(`Estado actualizado a "${estado}"`);
            setEstadoEquipo(null);
            cargar();
        } catch (err) {
            toast.error(err?.message ?? "No se pudo actualizar el estado");
        }
    };

    /**
     * Crea un cliente desde el modal hermano del MovimientoDialog.
     * Al guardar, refresca el catálogo y deja al usuario en el dialog
     * de movimiento (que ya tiene el cliente cargado en su dropdown).
     */
    const handleCrearCliente = async (payload) => {
        try {
            const { data, error } = await supabase
                .from("clientes")
                .insert(payload)
                .select("id, razon_social")
                .single();
            if (error) throw error;
            setClientes((prev) =>
                [...prev, data].sort((a, b) =>
                    a.razon_social.localeCompare(b.razon_social, "es"),
                ),
            );
            toast.success(`Cliente "${data.razon_social}" creado`);
            setCrearClienteAbierto(false);
            // Nota: el MovimientoDialog ya cerró este modal hermano y
            // ahora el usuario puede elegir el cliente recién creado.
        } catch (err) {
            toast.error(err?.message ?? "No se pudo crear el cliente");
        }
    };

    return (
        <section className="space-y-4">
            <EquiposHeader
                activeFilter={filtroBodega}
                onFilterBodega={cambiarBodega}
                showCorrelativo={false}
            />

            <section aria-labelledby="resumen-bodegas-titulo">
                <div className="mb-2 flex items-end justify-between gap-3">
                    <div>
                        <h2
                            id="resumen-bodegas-titulo"
                            className="text-sm font-black text-slate-800 dark:text-slate-100"
                        >
                            Resumen por ubicación
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                            Total de equipos operativos e inoperativos en cada bodega.
                        </p>
                    </div>
                </div>
                <ResumenBodegas equipos={equiposActivos} />
            </section>

            <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.10)] sm:p-6 dark:border-white/10 dark:bg-carbon-900">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <h2 className="text-[1.2rem] font-bold text-slate-900 sm:justify-self-start dark:text-slate-100">
                        Inventario registrado
                    </h2>
                    <p className="text-xs font-medium text-slate-500 dark:text-neutral-400 sm:flex-1 sm:px-4">
                        Selecciona una fila para ver la ficha completa y sus movimientos.
                    </p>
                    <label className="w-full sm:w-72">
                        <span className="sr-only">Buscar en el inventario</span>
                        <input
                            type="search"
                            value={busqueda}
                            onChange={(e) => cambiarBusqueda(e.target.value)}
                            placeholder="🔍 Buscar equipo o batería asociada…"
                            className="min-h-[44px] w-full rounded-[10px] border-[1.5px] border-slate-300 bg-white px-3 py-2 text-[0.92rem] font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100 dark:placeholder-neutral-500"
                        />
                    </label>
                </div>

                {duplicados.size > 0 && (
                    <div className="mt-3 flex items-start gap-2.5 rounded-[10px] border-l-4 border-red-600 bg-red-50 px-3 py-2.5 text-[0.85rem] text-red-900 dark:bg-red-500/10 dark:text-red-300">
                        <span className="text-base">⚠️</span>
                        <div className="min-w-0 flex-1">
                            <p className="font-bold">
                                {duplicados.size === 1
                                    ? "Hay 1 N° interno repetido en una bodega"
                                    : `Hay ${duplicados.size} N° internos repetidos`}
                            </p>
                            <p className="mt-0.5 text-[0.8rem] text-red-800 dark:text-red-300">
                                Revisá los equipos marcados en rojo. El mismo N°
                                interno en la misma bodega indica que el equipo
                                fue registrado más de una vez o que hay un error
                                de tipeo.
                            </p>
                        </div>
                    </div>
                )}

                <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                    <div className="min-w-0 flex-1">
                        <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-neutral-400">
                            Filtrar inventario
                        </p>
                        <div
                            className="flex flex-wrap gap-2"
                            role="group"
                            aria-label="Filtros del inventario"
                        >
                            {filtrosInventario.map((filtro) => {
                                const activo =
                                    filtro.id === "todos"
                                        ? !vistaRapida
                                        : vistaRapida === filtro.id;
                                const clases = CLASES_FILTRO[filtro.color];
                                return (
                                    <button
                                        key={filtro.id}
                                        type="button"
                                        onClick={() =>
                                            actualizarParametros({
                                                vista:
                                                    filtro.id === "todos" || activo
                                                        ? null
                                                        : filtro.id,
                                                filtros: null,
                                                pagina: null,
                                            })
                                        }
                                        aria-pressed={activo}
                                        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-[1.5px] px-3 py-2 text-[0.78rem] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                                            activo ? clases.activo : clases.inactivo
                                        }`}
                                    >
                                        {filtro.icono && (
                                            <span aria-hidden="true">{filtro.icono}</span>
                                        )}
                                        <span>{filtro.label}</span>
                                        <span
                                            className={`rounded-full px-1.5 py-0 text-xs tabular-nums ${
                                                activo
                                                    ? "bg-white/25"
                                                    : "bg-black/10 dark:bg-white/15"
                                            }`}
                                        >
                                            {conteosVistas[filtro.id] ?? 0}
                                        </span>
                                    </button>
                                );
                            })}

                            {(busqueda ||
                                filtroBodega !== "todas" ||
                                vistaRapida ||
                                ordenCampo !== "recientes" ||
                                ordenDireccion !== "desc") && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        actualizarParametros({
                                            q: null,
                                            bodega: null,
                                            filtros: null,
                                            vista: null,
                                            orden: null,
                                            direccion: null,
                                            pagina: null,
                                        });
                                    }}
                                    className="min-h-[44px] rounded-full border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-400 hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10"
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:items-end">
                        <label className="min-w-0 sm:w-52">
                            <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-neutral-300">
                                Ordenar por
                            </span>
                            <select
                                value={ordenCampo}
                                onChange={(event) => ordenarPor(event.target.value)}
                                className="min-h-[44px] w-full rounded-xl border-[1.5px] border-slate-300 bg-white px-3 py-2 text-base font-semibold text-slate-800 outline-none transition focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 sm:text-sm dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100"
                            >
                                <option value="recientes">Fecha de registro</option>
                                <option value="numero_interno">N° interno</option>
                                <option value="tipo_equipo">Tipo de equipo</option>
                                <option value="estado_operacional">Estado operacional</option>
                                <option value="ubicacion">Ubicación / cliente</option>
                                <option value="horometro">Horómetro</option>
                                <option value="faltantes">Cantidad de faltantes</option>
                            </select>
                        </label>
                        <button
                            type="button"
                            onClick={() => ordenarPor(ordenCampo)}
                            className="min-h-[44px] rounded-xl border-[1.5px] border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200 dark:hover:bg-blue-500/10"
                            aria-label={`Cambiar orden a ${
                                ordenDireccion === "asc"
                                    ? "descendente"
                                    : "ascendente"
                            }`}
                            title="Invertir orden"
                        >
                            {ordenDireccion === "asc" ? "↑ Ascendente" : "↓ Descendente"}
                        </button>
                    </div>
                </div>

                {cargando && equipos.length === 0 ? (
                    <InventarioSkeleton />
                ) : equiposOrdenados.length === 0 ? (
                    <div className="mt-4 rounded-[10px] border-2 border-dashed border-slate-300 px-5 py-7 text-center text-sm text-slate-500 dark:border-white/15 dark:text-neutral-400">
                        {equiposActivos.length === 0
                            ? 'Aún no hay registros. Ve a "Registrar" para empezar.'
                            : "No se encontraron equipos con los filtros actuales."}
                    </div>
                ) : (
                    <TablaEquipos
                        key={`${busqueda}|${filtroBodega}|${vistaRapida}|${ordenCampo}|${ordenDireccion}|${pagina}`}
                        equipos={equiposPaginados}
                        duplicados={duplicados}
                        clientesById={clientesById}
                        ordenCampo={ordenCampo}
                        ordenDireccion={ordenDireccion}
                        onOrdenar={ordenarPor}
                        onMover={setMovimientoEquipo}
                        onEstado={setEstadoEquipo}
                        onHistorial={setHistorialEquipo}
                        onBateria={setBateriaEquipo}
                        onEliminar={setConfirmId}
                        onVerFoto={setFotoModalPath}
                        onGuardarEdicion={handleActualizarDatos}
                    />
                )}

                {equiposOrdenados.length > 0 && (
                    <Paginacion
                        pagina={pagina}
                        totalPaginas={totalPaginas}
                        desde={rangoActual.desde}
                        hasta={rangoActual.hasta}
                        total={equiposOrdenados.length}
                        onCambiar={cambiarPagina}
                    />
                )}
            </div>

            <ConfirmDialog
                open={Boolean(confirmId)}
                title="Eliminar equipo"
                message={
                    equipoAEliminar
                        ? `Vas a eliminar ${equipoAEliminar.marca} ${equipoAEliminar.modelo} (${equipoAEliminar.numero_interno}) de ${equipoAEliminar.bodega}. Esta acción no se puede deshacer.`
                        : ""
                }
                confirmLabel="Eliminar"
                onConfirm={handleConfirmarEliminar}
                onCancel={() => setConfirmId(null)}
                peligro
            />

            <MovimientoDialog
                open={Boolean(movimientoEquipo)}
                equipo={movimientoEquipo}
                clientes={clientes}
                onSubmit={handleRegistrarMovimientoSimple}
                onSubmitSwap={handleRegistrarSwap}
                onCrearCliente={() => setCrearClienteAbierto(true)}
                onCancel={() => setMovimientoEquipo(null)}
            />

            <MovimientoHistorialModal
                open={Boolean(historialEquipo)}
                equipo={historialEquipo}
                onClose={() => setHistorialEquipo(null)}
            />

            <EstadoDialog
                open={Boolean(estadoEquipo)}
                equipo={estadoEquipo}
                onSubmit={handleActualizarEstado}
                onCancel={() => setEstadoEquipo(null)}
            />

            <BateriaDialog
                open={Boolean(bateriaEquipo)}
                equipo={bateriaEquipo}
                onSubmit={handleCambiarBateria}
                onCancel={() => setBateriaEquipo(null)}
            />

            {/* Modal: foto en grande al clickear el thumbnail */}
            <FotoModal
                path={fotoModalPath}
                onClose={() => setFotoModalPath(null)}
            />

            {/* Modal hermano: crear cliente desde el botón "+ Nuevo"
                del dropdown de cliente en el MovimientoDialog. */}
            <CrearClienteForm
                open={crearClienteAbierto}
                onSubmit={handleCrearCliente}
                onCancel={() => setCrearClienteAbierto(false)}
            />
        </section>
    );
}

/**
 * FotoModal
 * ---------
 * Modal fullscreen para ver la foto del equipo en grande. Obtiene
 * la signed URL cacheada y la muestra centrada. Cierra con backdrop,
 * botón ✕ o tecla Escape.
 */
function FotoModal({ path, onClose }) {
    const dialogRef = useRef(null);
    const abierta = Boolean(path);
    const transicion = useModalTransition(abierta);
    const pathVisible = useRetainedValue(path, abierta);
    const [url, setUrl] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);

    useDialogA11y(abierta, { dialogRef, onClose });

    // Cargar signed URL cuando se abre
    useEffect(() => {
        if (!path) return undefined;
        let cancelado = false;
        setCargando(true);
        setError(null);
        (async () => {
            try {
                const u = await getFotoUrlCached(path, 3600);
                if (cancelado) return;
                if (u) {
                    setUrl(u);
                } else {
                    setError("No se pudo cargar la foto");
                }
            } catch (err) {
                if (!cancelado) setError(err?.message ?? "Error");
            } finally {
                if (!cancelado) setCargando(false);
            }
        })();
        return () => {
            cancelado = true;
        };
    }, [path]);

    if (!transicion.renderizar || !pathVisible) return null;

    return (
        <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Foto del equipo"
            tabIndex={-1}
            className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/85 p-4 ${transicion.claseFondo}`}
            onClick={onClose}
        >
            <div
                className={`relative max-h-[90dvh] max-w-[90dvw] ${transicion.claseImagen}`}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    data-dialog-autofocus
                    className="absolute -right-3 -top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg transition hover:bg-slate-100 dark:bg-carbon-800 dark:text-slate-200 dark:hover:bg-white/10"
                    aria-label="Cerrar"
                >
                    ✕
                </button>
                {cargando && (
                    <div className="flex h-64 w-64 items-center justify-center rounded-[12px] bg-slate-200 text-sm text-slate-500 dark:bg-carbon-800 dark:text-neutral-400">
                        Cargando…
                    </div>
                )}
                {error && !cargando && (
                    <div className="flex h-64 w-64 flex-col items-center justify-center gap-2 rounded-[12px] bg-white p-6 text-center dark:bg-carbon-900">
                        <span className="text-3xl">⚠️</span>
                        <p className="text-sm text-slate-700 dark:text-slate-200">{error}</p>
                    </div>
                )}
                {url && !cargando && !error && (
                    <img
                        src={url}
                        alt="Foto del equipo"
                        className="max-h-[90dvh] max-w-[90dvw] rounded-[12px] shadow-2xl"
                    />
                )}
            </div>
        </div>
    );
}
