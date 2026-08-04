import { useEffect, useMemo, useState } from "react";
import {
    BODEGAS,
    BODEGA_EN_CLIENTE,
} from "../../lib/equiposConstants";
import EstadoBadge from "../../components/equipos/EstadoBadge";
import ConfirmDialog from "../../components/equipos/ConfirmDialog";
import MovimientoDialog from "../../components/equipos/MovimientoDialog";
import MovimientoHistorialModal from "../../components/equipos/MovimientoHistorialModal";
import EquiposHeader from "../../components/equipos/EquiposHeader";
import ResumenBodegas from "../../components/equipos/ResumenBodegas";
import EquipoFoto from "../../components/equipos/EquipoFoto";
import CrearClienteForm from "../../components/equipos/CrearClienteForm";
import { useToast } from "../../context/ToastContext";
import { useNetwork } from "../../context/NetworkContext";
import { supabase } from "../../services/supabase";
import { getFotoUrlCached, replaceFotoEquipo } from "../../lib/equiposStorage";
import { formatearFecha, formatearFechaCorta } from "../../utils/format";
import {
    cacheEquipos,
    enqueuePendingWrite,
    getCachedEquipos,
} from "../../lib/offlineDb";

// Cantidad de cards por página en el inventario. Mobile-first: 20
// mantiene un scroll razonable sin saturar la pantalla.
const ITEMS_POR_PAGINA = 20;

const CAMPOS_BUSQUEDA = [
    "numero_interno",
    "numero_serie",
    "marca",
    "modelo",
    "tipo_equipo",
    "responsable",
    "ubicacion_actual",
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
                    className="rounded-lg border-[1.5px] border-slate-300 bg-white px-2.5 py-1.5 text-[0.78rem] font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200 dark:hover:bg-white/10"
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
                            className={`min-w-[2.25rem] rounded-lg border-[1.5px] px-2 py-1.5 text-[0.78rem] font-bold tabular-nums transition ${
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
                    className="rounded-lg border-[1.5px] border-slate-300 bg-white px-2.5 py-1.5 text-[0.78rem] font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200 dark:hover:bg-white/10"
                >
                    Siguiente →
                </button>
            </div>
        </nav>
    );
}

function parseFaltantes(valor) {
    if (!valor) return [];
    if (Array.isArray(valor)) return valor.filter(Boolean);
    return String(valor)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

/**
 * Vista principal de inventario de equipos.
 * Self-contained: carga desde cache + Supabase, expone handlers
 * de movimiento y eliminación (con soporte offline).
 */
export default function ListView() {
    const toast = useToast();
    const { online, refrescarPending } = useNetwork();

    const [equipos, setEquipos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState("");
    const [filtroBodega, setFiltroBodega] = useState("todas");
    const [confirmId, setConfirmId] = useState(null);
    const [soloDuplicados, setSoloDuplicados] = useState(false);
    const [filtroRapido, setFiltroRapido] = useState("todos");
    const [movimientoEquipo, setMovimientoEquipo] = useState(null);
    const [historialEquipo, setHistorialEquipo] = useState(null);
    const [pagina, setPagina] = useState(1);
    const [fotoModalPath, setFotoModalPath] = useState(null);
    // Modal hermano para crear cliente desde el dialog de movimiento.
    const [crearClienteAbierto, setCrearClienteAbierto] = useState(false);

    const cargar = async () => {
        setCargando(true);
        try {
            // 1. Cache primero
            const cached = await getCachedEquipos();
            if (cached.length > 0) setEquipos(cached);

            // 2. Datos frescos si hay red
            if (supabase && navigator.onLine) {
                const { data, error } = await supabase
                    .from("equipos")
                    .select("*")
                    .order("correlativo", { ascending: true });
                if (error) {
                    if (cached.length === 0) toast.error(error.message);
                } else {
                    setEquipos(data ?? []);
                    await cacheEquipos(data ?? []);
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

    const conteosFiltros = useMemo(() => {
        const base =
            filtroBodega === "todas"
                ? equiposActivos
                : equiposActivos.filter((e) => e.bodega === filtroBodega);
        return {
            todos: base.length,
            operativos: base.filter((e) => e.estado_operacional === "Operativo")
                .length,
            inoperativos: base.filter((e) => e.estado_operacional === "Inoperativo")
                .length,
            con_faltantes: base.filter((e) => {
                const f = parseFaltantes(e.elementos_faltantes);
                return f.length > 0;
            }).length,
            sin_foto: base.filter((e) => !e.foto_enviada).length,
        };
    }, [equiposActivos, filtroBodega]);

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
            if (filtroBodega === BODEGA_EN_CLIENTE) {
                if (!e.cliente_id) return false;
            } else if (
                filtroBodega !== "todas" &&
                e.bodega !== filtroBodega
            ) {
                return false;
            }
            if (soloDuplicados) {
                const key = `${e.bodega}|${e.numero_interno}`;
                if (!duplicados.has(key)) return false;
            }
            if (
                filtroRapido === "operativos" &&
                e.estado_operacional !== "Operativo"
            )
                return false;
            if (
                filtroRapido === "inoperativos" &&
                e.estado_operacional !== "Inoperativo"
            )
                return false;
            if (filtroRapido === "con_faltantes") {
                const f = parseFaltantes(e.elementos_faltantes);
                if (f.length === 0) return false;
            }
            if (filtroRapido === "sin_foto" && e.foto_enviada) return false;
            if (!texto) return true;
            return CAMPOS_BUSQUEDA.some((c) =>
                String(e[c] ?? "")
                    .toLowerCase()
                    .includes(texto),
            );
        });
    }, [equiposActivos, busqueda, filtroBodega, soloDuplicados, duplicados, filtroRapido]);

    useEffect(() => {
        setPagina(1);
    }, [busqueda, filtroBodega, soloDuplicados, filtroRapido]);

    const totalPaginas = Math.max(
        1,
        Math.ceil(equiposFiltrados.length / ITEMS_POR_PAGINA),
    );

    useEffect(() => {
        if (pagina > totalPaginas) setPagina(totalPaginas);
    }, [pagina, totalPaginas]);

    const equiposPaginados = useMemo(() => {
        const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
        return equiposFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);
    }, [equiposFiltrados, pagina]);

    const rangoActual = useMemo(() => {
        if (equiposFiltrados.length === 0) return { desde: 0, hasta: 0 };
        const desde = (pagina - 1) * ITEMS_POR_PAGINA + 1;
        const hasta = Math.min(
            pagina * ITEMS_POR_PAGINA,
            equiposFiltrados.length,
        );
        return { desde, hasta };
    }, [equiposFiltrados.length, pagina]);

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

    /**
     * Movimiento simple: una sola llamada al RPC.
     * Offline-capable (siempre que no haya foto nueva adjunta).
     */
    const handleRegistrarMovimientoSimple = async (payload) => {
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
                // 1. Si hay foto nueva, subir a Storage (reemplaza la vieja)
                const nuevaFotoUrl = await subirFotoSiHay(payload);
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
                        p_foto_url: nuevaFotoUrl,
                        p_categoria: payload.categoria ?? null,
                        p_destino_externo: payload.destino_externo ?? null,
                    },
                );
                if (error) throw error;
                toast.success(
                    nuevaFotoUrl
                        ? "Movimiento registrado · foto actualizada"
                        : "Movimiento registrado",
                );
            }
            setMovimientoEquipo(null);
            cargar();
        } catch (err) {
            toast.error(err?.message ?? "No se pudo registrar el movimiento");
        }
    };

    /**
     * Swap (cambio de equipo bidireccional).
     * Requiere conexión: la pierna 2 depende del padre.id que retorna
     * la pierna 1. Si la pierna 2 falla, NO se hace rollback: el
     * operador recibe un toast claro y registra la pierna 2 manualmente.
     */
    const handleRegistrarSwap = async (payload) => {
        if (!online) {
            toast.warning(
                "Los cambios de equipo requieren conexión. Espera a tener red.",
            );
            return;
        }

        try {
            // 1. Subir foto nueva (solo la pierna "envío" lleva foto).
            const nuevaFotoUrl = await subirFotoSiHay(payload);
            if (nuevaFotoUrl === "ERROR") return;

            // 2. Pierna envío: equipo actual → cliente
            // OJO: p_bodega_destino debe ir NULL. El RPC prioriza bodega
            // sobre cliente (si bodega_destino IS NOT NULL → cliente_id
            // queda NULL) y el equipo nunca llegaría al cliente.
            const { data: padreId, error: err1 } = await supabase.rpc(
                "registrar_movimiento",
                {
                    p_equipo_id: payload.equipo_id,
                    p_motivo: payload.motivo,
                    p_bodega_destino: null,
                    p_responsable: payload.responsable,
                    p_bodega_origen: payload.bodega_origen ?? null,
                    p_cliente_destino_id: payload.cliente_destino_id,
                    p_ubicacion_origen: payload.ubicacion_origen ?? null,
                    p_ubicacion_destino: payload.ubicacion_destino ?? null,
                    p_notas: payload.notas ?? null,
                    p_foto_url: nuevaFotoUrl,
                    p_categoria: payload.categoria,
                },
            );
            if (err1) throw err1;

            // 3. Pierna recepción: equipo del cliente → bodega destino
            const { error: err2 } = await supabase.rpc(
                "registrar_movimiento",
                {
                    p_equipo_id: payload.equipo_recibe_id,
                    p_motivo: payload.motivo,
                    p_bodega_destino: payload.bodega_recibe_destino,
                    p_responsable: payload.responsable,
                    p_bodega_origen: null,
                    p_cliente_origen_id: payload.cliente_destino_id,
                    p_notas: payload.notas ?? null,
                    p_foto_url: null,
                    p_categoria: payload.categoria,
                    p_movimiento_padre_id: padreId,
                    p_equipo_relacionado_id: payload.equipo_id,
                },
            );

            if (err2) {
                // Inconsistencia: pierna 1 OK, pierna 2 falló.
                console.error("[swap] pierna 2 falló:", err2);
                toast.warning(
                    "Se registró el envío al cliente, pero la recepción del equipo del cliente falló. Registra la recepción manualmente desde el equipo correspondiente.",
                );
            } else {
                toast.success("Cambio de equipo registrado");
            }

            setMovimientoEquipo(null);
            cargar();
        } catch (err) {
            toast.error(err?.message ?? "No se pudo registrar el cambio");
        }
    };

    /**
     * Sube la foto nueva al bucket (reemplaza la anterior si hay).
     * Retorna la URL nueva, null si no había foto, o la string "ERROR"
     * si falló (en cuyo caso ya se emitió un toast).
     */
    const subirFotoSiHay = async (payload) => {
        if (!payload.fotoFile) return null;
        try {
            return await replaceFotoEquipo(
                payload.fotoFile,
                movimientoEquipo?.correlativo,
                payload.oldFotoUrl,
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
        categoria: payload.categoria ?? null,
        destino_externo: payload.destino_externo ?? null,
        p_foto_url: null, // bloqueado si había foto
    });

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
                onFilterBodega={setFiltroBodega}
                showCorrelativo={false}
            />

            <ResumenBodegas
                equipos={equiposActivos}
                activa={filtroBodega}
                onSelect={(b) => setFiltroBodega(b)}
            />

            <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.10)] sm:p-6 dark:border-white/10 dark:bg-carbon-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="w-full text-[1.2rem] font-bold text-slate-900 sm:w-auto dark:text-slate-100">
                        Inventario registrado
                    </h2>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <select
                            value={filtroBodega}
                            onChange={(e) => setFiltroBodega(e.target.value)}
                            className="rounded-[10px] border-[1.5px] border-slate-300 bg-white px-3 py-2 text-[0.92rem] font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100"
                            aria-label="Filtrar por bodega"
                        >
                            <option value="todas">Todas las ubicaciones</option>
                            <option value={BODEGA_EN_CLIENTE}>
                                🏢 En cliente
                            </option>
                            <optgroup label="Bodegas">
                                {BODEGAS.map((b) => (
                                    <option key={b} value={b}>
                                        {b}
                                    </option>
                                ))}
                            </optgroup>
                        </select>
                        <input
                            type="search"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="🔍 Buscar (N° interno, serie, marca...)"
                            className="min-w-0 flex-1 rounded-[10px] border-[1.5px] border-slate-300 bg-white px-3 py-2 text-[0.92rem] font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 sm:w-72 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100 dark:placeholder-neutral-500"
                        />
                    </div>
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

                <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-[0.85rem] font-medium text-slate-700 dark:text-slate-200">
                        <input
                            type="checkbox"
                            checked={soloDuplicados}
                            onChange={(e) =>
                                setSoloDuplicados(e.target.checked)
                            }
                            className="h-4 w-4 accent-red-600"
                        />
                        Solo mostrar con N° interno repetido
                        {duplicados.size > 0 && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[0.68rem] font-bold text-red-700 dark:bg-red-500/10 dark:text-red-400">
                                {duplicados.size}
                            </span>
                        )}
                    </label>
                </div>

                <div
                    className="mt-3 flex flex-wrap gap-2"
                    role="group"
                    aria-label="Filtros rápidos"
                >
                    {[
                        { id: "todos", label: "Todos", color: "slate" },
                        { id: "operativos", label: "Operativos", color: "green" },
                        { id: "inoperativos", label: "Inoperativos", color: "red" },
                        { id: "con_faltantes", label: "Con faltantes", color: "amber" },
                        { id: "sin_foto", label: "Sin foto", color: "blue" },
                    ].map((chip) => {
                        const activo = filtroRapido === chip.id;
                        const count = conteosFiltros[chip.id] ?? 0;
                        const colorClasses = {
                            slate: activo
                                ? "border-slate-700 bg-slate-900 text-white"
                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200 dark:hover:bg-white/10",
                            green: activo
                                ? "border-green-700 bg-green-600 text-white"
                                : "border-green-300 bg-green-50 text-green-800 hover:bg-green-100 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20",
                            red: activo
                                ? "border-red-700 bg-red-600 text-white"
                                : "border-red-300 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20",
                            amber: activo
                                ? "border-amber-700 bg-amber-600 text-white"
                                : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20",
                            blue: activo
                                ? "border-blue-700 bg-blue-600 text-white"
                                : "border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20",
                        }[chip.color];
                        return (
                            <button
                                key={chip.id}
                                type="button"
                                onClick={() => setFiltroRapido(chip.id)}
                                aria-pressed={activo}
                                className={`flex items-center gap-1.5 rounded-full border-[1.5px] px-3 py-1.5 text-[0.78rem] font-bold transition ${colorClasses}`}
                            >
                                <span>{chip.label}</span>
                                <span
                                    className={`rounded-full px-1.5 py-0 text-[0.68rem] tabular-nums ${
                                        activo ? "bg-white/25" : "bg-black/10 dark:bg-white/15"
                                    }`}
                                >
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-green-700 dark:bg-green-500/10 dark:text-green-400">
                        Operativo
                    </span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                        Op. c/ obs.
                    </span>
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-red-700 dark:bg-red-500/10 dark:text-red-400">
                        Inoperativo
                    </span>
                </div>

                {cargando && equipos.length === 0 ? (
                    <div className="mt-4 rounded-[10px] border-2 border-dashed border-slate-300 px-5 py-7 text-center text-sm text-slate-500 dark:border-white/15 dark:text-neutral-400">
                        Cargando inventario…
                    </div>
                ) : equiposFiltrados.length === 0 ? (
                    <div className="mt-4 rounded-[10px] border-2 border-dashed border-slate-300 px-5 py-7 text-center text-sm text-slate-500 dark:border-white/15 dark:text-neutral-400">
                        {equiposActivos.length === 0
                            ? 'Aún no hay registros. Ve a "Registrar" para empezar.'
                            : "No se encontraron equipos con los filtros actuales."}
                    </div>
                ) : (
                    <div className="mt-4 space-y-2">
                        {equiposPaginados.map((e) => {
                            const faltantes = parseFaltantes(e.elementos_faltantes);
                            const correlativo = e.correlativo ?? "—";
                            const dupKey = `${e.bodega}|${e.numero_interno}`;
                            const esDuplicado = duplicados.has(dupKey);
                            return (
                                <article
                                    key={e.id}
                                    className={`group grid grid-cols-[60px_1fr] items-center gap-3 rounded-[10px] border p-3.5 transition sm:grid-cols-[60px_96px_1fr] sm:gap-4 sm:p-4 ${
                                        esDuplicado
                                            ? "border-red-300 bg-red-50/40 hover:shadow-[0_14px_30px_rgba(220,38,38,0.10)] dark:border-red-500/30 dark:bg-red-500/10"
                                            : "border-slate-200 bg-white hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(16,24,40,0.06)] dark:border-white/10 dark:bg-carbon-900"
                                    }`}
                                >
                                    <div className="self-center rounded-[10px] bg-slate-900 px-1 py-2 text-center font-extrabold text-white">
                                        <span className="block text-[1.2rem] leading-none tabular-nums">
                                            {String(correlativo).padStart(4, "0")}
                                        </span>
                                        <span className="mt-0.5 block text-[0.55rem] uppercase tracking-wider text-slate-400">
                                            N°
                                        </span>
                                    </div>

                                    {/* Thumbnail: oculto en mobile (aparece
                                        inline en el header), visible en sm+ */}
                                    <div className="hidden sm:block">
                                        <EquipoFoto
                                            path={e.foto_url || null}
                                            size="md"
                                            onClick={() =>
                                                setFotoModalPath(
                                                    e.foto_url || null,
                                                )
                                            }
                                        />
                                    </div>

                                    <div className="min-w-0">
                                        <div className="flex items-start gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                                            <span>
                                                {e.marca} {e.modelo}
                                            </span>
                                            <EstadoBadge estado={e.estado_operacional} />
                                            {e.cliente_id ? (
                                                <span
                                                    className="rounded-full bg-sky-100 px-2 py-0.5 text-[0.7rem] font-bold text-sky-800 dark:bg-sky-500/10 dark:text-sky-400"
                                                    title={`En cliente: ${clientesById.get(e.cliente_id)?.razon_social ?? `#${e.cliente_id}`}`}
                                                >
                                                    🏢{" "}
                                                    {clientesById.get(
                                                        e.cliente_id,
                                                    )?.razon_social ??
                                                        `Cliente #${e.cliente_id}`}
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[0.7rem] font-bold text-sky-800 dark:bg-sky-500/10 dark:text-sky-400">
                                                    {e.bodega}
                                                </span>
                                            )}
                                            {e.tipo_equipo && (
                                                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[0.7rem] font-bold text-violet-800 dark:bg-violet-500/10 dark:text-violet-400">
                                                    {e.tipo_equipo}
                                                </span>
                                            )}
                                            {esDuplicado && (
                                                <span
                                                    className="rounded-full bg-red-100 px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-red-700 dark:bg-red-500/10 dark:text-red-400"
                                                    title={`El N° interno "${e.numero_interno}" está repetido en ${e.bodega}`}
                                                >
                                                    ⚠ N° interno repetido
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.82rem] text-slate-600 dark:text-neutral-400">
                                            <span>
                                                <b className="font-semibold text-slate-900 dark:text-slate-100">
                                                    N° int:
                                                </b>{" "}
                                                <span className="font-mono">
                                                    {e.numero_interno || "—"}
                                                </span>
                                            </span>
                                            <span>
                                                <b className="font-semibold text-slate-900 dark:text-slate-100">
                                                    Serie:
                                                </b>{" "}
                                                {e.numero_serie || "—"}
                                            </span>
                                            {e.ubicacion_actual && (
                                                <span>
                                                    <b className="font-semibold text-slate-900 dark:text-slate-100">
                                                        Ubicación:
                                                    </b>{" "}
                                                    {e.ubicacion_actual}
                                                </span>
                                            )}
                                            {e.horometro !== null &&
                                                e.horometro !== undefined &&
                                                e.horometro !== "" && (
                                                    <span>
                                                        <b className="font-semibold text-slate-900 dark:text-slate-100">
                                                            Horómetro:
                                                        </b>{" "}
                                                        {e.horometro}
                                                    </span>
                                                )}
                                        </div>

                                        {e.observaciones && (
                                            <div
                                                className={`mt-1.5 rounded border-l-[3px] px-2.5 py-1.5 text-[0.85rem] ${
                                                    e.estado_operacional ===
                                                    "Operativo con observaciones"
                                                        ? "border-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-slate-200"
                                                        : "border-slate-300 bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
                                                }`}
                                            >
                                                {e.observaciones}
                                            </div>
                                        )}

                                        {(e.ubicacion_actual ||
                                            e.ultimo_movimiento) && (
                                            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.82rem] text-slate-700 dark:text-slate-200">
                                                <span className="font-semibold">
                                                    📍 {e.ubicacion_actual || e.bodega}
                                                </span>
                                                {e.ultimo_movimiento && (
                                                    <span className="text-[0.78rem] text-slate-500 dark:text-neutral-400">
                                                        · Movido a{" "}
                                                        <strong className="text-slate-700 dark:text-slate-200">
                                                            {
                                                                e.ultimo_movimiento
                                                                    .bodega_destino
                                                            }
                                                        </strong>{" "}
                                                        el{" "}
                                                        {formatearFechaCorta(
                                                            e.ultimo_movimiento.fecha,
                                                        )}{" "}
                                                        por{" "}
                                                        <strong className="text-slate-700 dark:text-slate-200">
                                                            {
                                                                e.ultimo_movimiento
                                                                    .responsable
                                                            }
                                                        </strong>{" "}
                                                        <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[0.68rem] font-bold text-violet-800 dark:bg-violet-500/10 dark:text-violet-400">
                                                            {
                                                                e.ultimo_movimiento
                                                                    .motivo
                                                            }
                                                        </span>
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {faltantes.length > 0 && (
                                            <div className="mt-1.5 text-[0.78rem] font-medium text-red-700 dark:text-red-400">
                                                ⚠ Faltantes:{" "}
                                                {faltantes.join(", ")}
                                            </div>
                                        )}

                                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-slate-500 dark:text-neutral-400">
                                            <span>
                                                👤{" "}
                                                <b className="font-semibold text-slate-700 dark:text-slate-200">
                                                    {e.responsable}
                                                </b>
                                            </span>
                                            <span>
                                                📅 {formatearFecha(e.created_at)}
                                            </span>
                                            <div className="ml-auto flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setMovimientoEquipo(e)
                                                    }
                                                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[0.78rem] font-bold text-blue-700 transition hover:-translate-y-px hover:border-blue-300 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:border-blue-500/50 dark:hover:bg-blue-500/20"
                                                    title="Registrar un traslado o cambio de ubicación"
                                                >
                                                    🔄 Mover
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setHistorialEquipo(e)
                                                    }
                                                    className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[0.78rem] font-bold text-slate-700 transition hover:-translate-y-px hover:bg-slate-50 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200 dark:hover:bg-white/10"
                                                    title="Ver historial completo de movimientos"
                                                >
                                                    📜 Historial
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setConfirmId(e.id)
                                                    }
                                                    className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[0.78rem] font-bold text-red-700 transition hover:-translate-y-px hover:bg-red-300 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </div>
                                            </div>
                                            {/* Thumbnail mobile: visible <sm */}
                                            <div className="shrink-0 sm:hidden">
                                                <EquipoFoto
                                                    path={e.foto_url || null}
                                                    size="sm"
                                                    onClick={() =>
                                                        setFotoModalPath(
                                                            e.foto_url || null,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}

                {equiposFiltrados.length > 0 && (
                    <Paginacion
                        pagina={pagina}
                        totalPaginas={totalPaginas}
                        desde={rangoActual.desde}
                        hasta={rangoActual.hasta}
                        total={equiposFiltrados.length}
                        onCambiar={setPagina}
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
    const [url, setUrl] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);

    // Cerrar con Escape
    useEffect(() => {
        if (!path) return undefined;
        const handler = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [path, onClose]);

    // Cargar signed URL cuando se abre
    useEffect(() => {
        if (!path) {
            setUrl(null);
            setError(null);
            return undefined;
        }
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

    if (!path) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Foto del equipo"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/85 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="relative max-h-[90vh] max-w-[90vw]"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
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
                        className="max-h-[90vh] max-w-[90vw] rounded-[12px] shadow-2xl"
                    />
                )}
            </div>
        </div>
    );
}