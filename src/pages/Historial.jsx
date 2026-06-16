import { useCallback, useState, useMemo } from "react";
import { supabase } from "../services/supabase";
import { exportToExcel } from "../utils/exportToExcel";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { withRetry } from "../utils/withRetry";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";

const formatCLP = (value) =>
    new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
    }).format(value || 0);

function Historial() {
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [tipoFiltro, setTipoFiltro] = useState("todos"); // todos | entrada | salida
    const [busqueda, setBusqueda] = useState("");
    const [expandido, setExpandido] = useState(null);
    const { showToast } = useToast();

    const cargarMovimientos = useCallback(async () => {
        const res = await withRetry(() =>
            supabase
                .from("movimientos")
                .select(
                    `id, tipo_movimiento, motivo_movimiento, cantidad, precio_unitario, proveedor, numero_documento, tipo_documento, solicitante, destino, observacion, fecha, productos (nombre, codigo)`
                )
                .order("id", { ascending: false })
        );
        if (res.error) throw res.error;
        return res.data || [];
    }, []);

    const { data: movimientos = [], loading } = useAsync(
        cargarMovimientos,
        {
            errorContexto: "cargar el historial",
            onError: (err) => showToast(err.message, "error"),
        }
    );

    const exportarHistorial = () => {
        if (movimientosFiltrados.length === 0) {
            showToast("No hay movimientos para exportar", "warning");
            return;
        }
        const dataExport = movimientosFiltrados.map((mov) => ({
            ID: mov.id,
            Fecha: mov.fecha || "",
            Tipo: mov.tipo_movimiento || "",
            Motivo: mov.motivo_movimiento || "",
            Código: mov.productos?.codigo || "",
            Producto: mov.productos?.nombre || "",
            Cantidad: mov.cantidad ?? 0,
            "Precio unitario": mov.precio_unitario ?? 0,
            Proveedor: mov.proveedor || "",
            "Tipo documento": mov.tipo_documento || "",
            Documento: mov.numero_documento || "",
            Solicitante: mov.solicitante || "",
            Destino: mov.destino || "",
            Observación: mov.observacion || "",
        }));
        exportToExcel(dataExport, "historial_movimientos_bodega", "Historial");
        showToast("Reporte exportado");
    };

    const counts = useMemo(() => {
        return {
            todos: movimientos.length,
            entrada: movimientos.filter((m) => m.tipo_movimiento === "entrada")
                .length,
            salida: movimientos.filter((m) => m.tipo_movimiento === "salida")
                .length,
        };
    }, [movimientos]);

    const movimientosFiltrados = useMemo(() => {
        const texto = busqueda.toLowerCase();
        return movimientos.filter((mov) => {
            const cumpleTipo =
                tipoFiltro === "todos" || mov.tipo_movimiento === tipoFiltro;
            const cumpleDesde = fechaDesde ? mov.fecha >= fechaDesde : true;
            const cumpleHasta = fechaHasta ? mov.fecha <= fechaHasta : true;
            const cumpleTexto =
                !texto ||
                mov.productos?.nombre?.toLowerCase().includes(texto) ||
                mov.productos?.codigo?.toLowerCase().includes(texto) ||
                mov.observacion?.toLowerCase().includes(texto) ||
                mov.proveedor?.toLowerCase().includes(texto) ||
                mov.solicitante?.toLowerCase().includes(texto);
            return cumpleTipo && cumpleDesde && cumpleHasta && cumpleTexto;
        });
    }, [movimientos, fechaDesde, fechaHasta, tipoFiltro, busqueda]);

    const limpiarFiltros = () => {
        setFechaDesde("");
        setFechaHasta("");
        setTipoFiltro("todos");
        setBusqueda("");
    };

    const getTipoBadge = (tipo) => {
        if (tipo === "entrada")
            return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/30";
        if (tipo === "salida")
            return "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60 dark:bg-rose-500/15 dark:text-rose-400 dark:ring-rose-500/30";
        return "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/30";
    };

    const getMotivoLabel = (motivo) => {
        const labels = {
            compra: "Compra",
            ajuste_positivo: "Ajuste positivo",
            ajuste_negativo: "Ajuste negativo",
            devolucion: "Devolución",
            traslado: "Traslado",
            stock_inicial: "Stock inicial",
            consumo_interno: "Consumo interno",
            venta: "Venta",
            proyecto: "Proyecto",
            merma: "Merma",
        };
        return labels[motivo] || motivo;
    };

    const filtrosActivos =
        fechaDesde || fechaHasta || tipoFiltro !== "todos" || busqueda;

    return (
        <div className="space-y-6">
            <PageHeader
                icon="📜"
                title="Historial"
                subtitle="Movimientos de entrada y salida"
                actions={
                    <button
                        onClick={exportarHistorial}
                        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-800 px-3 py-2 text-xs font-medium text-white shadow-sm transition-all duration-200 hover:bg-slate-900 hover:shadow-md active:scale-95 dark:bg-slate-700 dark:hover:bg-slate-600 sm:gap-2 sm:px-4 sm:text-sm"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="shrink-0"
                        >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Excel
                    </button>
                }
            />

            {/* Búsqueda */}
            <div className="relative">
                <svg
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    type="text"
                    placeholder="Buscar por producto, código, proveedor..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200/60 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-sm transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20 sm:text-base"
                />
            </div>

            {/* Chips de tipo */}
            <div className="flex flex-wrap gap-2">
                {[
                    { key: "todos", label: "Todos", tone: "slate" },
                    { key: "entrada", label: "Entradas", tone: "emerald" },
                    { key: "salida", label: "Salidas", tone: "rose" },
                ].map((chip) => {
                    const active = tipoFiltro === chip.key;
                    const tones = {
                        slate: active
                            ? "bg-slate-800 text-white border-slate-800 dark:bg-slate-700 dark:border-slate-700"
                            : "bg-white text-slate-700 border-slate-200/60 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800",
                        emerald: active
                            ? "bg-emerald-500 text-white border-emerald-500"
                            : "bg-white text-emerald-700 border-emerald-200/60 hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-400 dark:border-emerald-500/30 dark:hover:bg-emerald-500/10",
                        rose: active
                            ? "bg-rose-500 text-white border-rose-500"
                            : "bg-white text-rose-700 border-rose-200/60 hover:bg-rose-50 dark:bg-slate-900 dark:text-rose-400 dark:border-rose-500/30 dark:hover:bg-rose-500/10",
                    };
                    return (
                        <button
                            key={chip.key}
                            onClick={() => setTipoFiltro(chip.key)}
                            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 ${tones[chip.tone]}`}
                        >
                            {chip.label}
                            <span
                                className={`rounded-full px-1.5 text-[10px] font-semibold ${
                                    active
                                        ? "bg-white/20 text-white"
                                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                }`}
                            >
                                {counts[chip.key]}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Filtros de fecha */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/60 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:flex-wrap sm:items-end sm:p-4">
                <div className="flex flex-1 flex-col sm:flex-none">
                    <label className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Desde
                    </label>
                    <input
                        type="date"
                        value={fechaDesde}
                        onChange={(e) => setFechaDesde(e.target.value)}
                        className="w-full rounded-xl border border-slate-200/60 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20 sm:w-auto"
                    />
                </div>
                <div className="flex flex-1 flex-col sm:flex-none">
                    <label className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Hasta
                    </label>
                    <input
                        type="date"
                        value={fechaHasta}
                        onChange={(e) => setFechaHasta(e.target.value)}
                        className="w-full rounded-xl border border-slate-200/60 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20 sm:w-auto"
                    />
                </div>
                {filtrosActivos && (
                    <button
                        onClick={limpiarFiltros}
                        className="rounded-xl border border-slate-200/60 bg-white px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                        Limpiar todo
                    </button>
                )}
            </div>

            {/* Timeline de movimientos */}
            <div>
                {loading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-20" />
                        ))}
                    </div>
                ) : movimientosFiltrados.length === 0 ? (
                    <EmptyState
                        icon="📜"
                        title="Sin movimientos"
                        description={
                            filtrosActivos
                                ? "No hay movimientos con esos filtros"
                                : "Aún no se han registrado movimientos"
                        }
                    />
                ) : (
                    <ul className="space-y-2">
                        {movimientosFiltrados.map((mov) => {
                            const isExpanded = expandido === mov.id;
                            const hasDetails =
                                mov.precio_unitario ||
                                mov.proveedor ||
                                mov.numero_documento ||
                                mov.solicitante ||
                                mov.destino ||
                                mov.observacion;
                            return (
                                <li
                                    key={mov.id}
                                    className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-all duration-200 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                                >
                                    <button
                                        onClick={() =>
                                            hasDetails &&
                                            setExpandido(
                                                isExpanded ? null : mov.id
                                            )
                                        }
                                        className={`flex w-full items-center gap-3 p-3 text-left sm:p-4 ${
                                            hasDetails
                                                ? "cursor-pointer"
                                                : "cursor-default"
                                        }`}
                                    >
                                        {/* Indicador de tipo */}
                                        <div
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                                                mov.tipo_movimiento === "entrada"
                                                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                                                    : "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
                                            }`}
                                        >
                                            {mov.tipo_movimiento === "entrada"
                                                ? "⬇️"
                                                : "⬆️"}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                                    {mov.productos?.nombre ||
                                                        "Producto sin nombre"}
                                                </p>
                                                {mov.productos?.codigo && (
                                                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                        {mov.productos.codigo}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                <span>{mov.fecha}</span>
                                                {mov.motivo_movimiento && (
                                                    <>
                                                        <span>·</span>
                                                        <span>
                                                            {getMotivoLabel(
                                                                mov.motivo_movimiento
                                                            )}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div
                                            className={`shrink-0 text-right ${
                                                mov.tipo_movimiento === "entrada"
                                                    ? "text-emerald-600 dark:text-emerald-400"
                                                    : "text-rose-600 dark:text-rose-400"
                                            }`}
                                        >
                                            <p className="text-base font-semibold tabular-nums">
                                                {mov.tipo_movimiento === "entrada"
                                                    ? "+"
                                                    : "−"}
                                                {mov.cantidad}
                                            </p>
                                            <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                                {mov.tipo_movimiento}
                                            </p>
                                        </div>

                                        {hasDetails && (
                                            <svg
                                                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500 ${
                                                    isExpanded
                                                        ? "rotate-180"
                                                        : ""
                                                }`}
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <polyline points="6 9 12 15 18 9" />
                                            </svg>
                                        )}
                                    </button>

                                    {isExpanded && hasDetails && (
                                        <div className="border-t border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30 sm:p-4">
                                            <div className="grid gap-3 text-xs sm:grid-cols-2">
                                                {mov.precio_unitario && (
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                                            Precio unitario
                                                        </p>
                                                        <p className="font-medium text-slate-700 dark:text-slate-200">
                                                            {formatCLP(
                                                                mov.precio_unitario
                                                            )}
                                                        </p>
                                                    </div>
                                                )}
                                                {mov.proveedor && (
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                                            Proveedor
                                                        </p>
                                                        <p className="font-medium text-slate-700 dark:text-slate-200">
                                                            {mov.proveedor}
                                                        </p>
                                                    </div>
                                                )}
                                                {mov.tipo_documento && (
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                                            Tipo documento
                                                        </p>
                                                        <p className="font-medium text-slate-700 dark:text-slate-200">
                                                            {mov.tipo_documento}
                                                        </p>
                                                    </div>
                                                )}
                                                {mov.numero_documento && (
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                                            N° documento
                                                        </p>
                                                        <p className="font-medium text-slate-700 dark:text-slate-200">
                                                            {
                                                                mov.numero_documento
                                                            }
                                                        </p>
                                                    </div>
                                                )}
                                                {mov.solicitante && (
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                                            Solicitante
                                                        </p>
                                                        <p className="font-medium text-slate-700 dark:text-slate-200">
                                                            {mov.solicitante}
                                                        </p>
                                                    </div>
                                                )}
                                                {mov.destino && (
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                                            Destino
                                                        </p>
                                                        <p className="font-medium text-slate-700 dark:text-slate-200">
                                                            {mov.destino}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            {mov.observacion && (
                                                <div className="mt-3 rounded-xl bg-white p-3 text-xs italic text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                                    "{mov.observacion}"
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default Historial;
