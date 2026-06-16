import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { exportToExcel } from "../utils/exportToExcel";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";

const formatCLP = (value) =>
    new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
    }).format(value || 0);

function StockActual() {
    const [stock, setStock] = useState([]);
    const [productos, setProductos] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [loading, setLoading] = useState(true);
    const [filtroEstado, setFiltroEstado] = useState("todos"); // todos | bajo | sin_stock
    const { showToast } = useToast();

    const cargarStock = async () => {
        setLoading(true);
        const [stockRes, productosRes] = await Promise.all([
            supabase
                .from("stock_actual")
                .select("*")
                .order("nombre", { ascending: true }),
            supabase.from("productos").select("*"),
        ]);

        if (stockRes.error) {
            console.error(stockRes.error);
            showToast("Error al cargar stock", "error");
        } else {
            setStock(stockRes.data || []);
        }

        if (!productosRes.error) {
            setProductos(productosRes.data || []);
        }
        setLoading(false);
    };

    const exportarStock = () => {
        if (stock.length === 0) {
            showToast("No hay stock para exportar", "warning");
            return;
        }
        const dataExport = stock.map((item) => ({
            ID: item.id,
            Código: item.codigo || "",
            Nombre: item.nombre || "",
            Stock: item.stock ?? 0,
        }));
        exportToExcel(dataExport, "stock_actual_bodega", "Stock");
        showToast("Reporte exportado");
    };

    useEffect(() => {
        cargarStock();
    }, []);

    const stockConEstado = stock.map((item) => {
        const producto = productos.find((p) => p.id === item.id);
        const stockMin = producto?.stock_minimo ?? 0;
        const estado =
            item.stock <= 0
                ? "sin_stock"
                : item.stock <= stockMin
                ? "bajo"
                : "ok";
        return { ...item, stockMin, estado, producto };
    });

    const stockFiltrado = stockConEstado
        .filter((item) => {
            const texto = busqueda.toLowerCase();
            const matchTexto =
                item.nombre?.toLowerCase().includes(texto) ||
                item.codigo?.toLowerCase().includes(texto);
            const matchEstado =
                filtroEstado === "todos" || item.estado === filtroEstado;
            return matchTexto && matchEstado;
        })
        .sort((a, b) => {
            // Priorizar sin stock, luego bajo, luego por nombre
            const orden = { sin_stock: 0, bajo: 1, ok: 2 };
            if (orden[a.estado] !== orden[b.estado]) {
                return orden[a.estado] - orden[b.estado];
            }
            return (a.nombre || "").localeCompare(b.nombre || "");
        });

    const counts = {
        todos: stockConEstado.length,
        bajo: stockConEstado.filter((i) => i.estado === "bajo").length,
        sin_stock: stockConEstado.filter((i) => i.estado === "sin_stock").length,
    };

    const getEstadoBadge = (estado) => {
        if (estado === "sin_stock")
            return "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60";
        if (estado === "bajo")
            return "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60";
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60";
    };

    const getEstadoLabel = (estado) => {
        if (estado === "sin_stock") return "Sin stock";
        if (estado === "bajo") return "Stock bajo";
        return "OK";
    };

    const getStockColor = (estado) => {
        if (estado === "sin_stock") return "text-rose-600";
        if (estado === "bajo") return "text-amber-600";
        return "text-slate-800";
    };

    return (
        <div className="space-y-6">
            <PageHeader
                icon="🗂️"
                title="Stock actual"
                subtitle="Unidades disponibles por producto"
                actions={
                    <button
                        onClick={exportarStock}
                        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-800 px-3 py-2 text-xs font-medium text-white shadow-sm transition-all duration-200 hover:bg-slate-900 hover:shadow-md active:scale-95 sm:gap-2 sm:px-4 sm:text-sm"
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

            {/* Filtros */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <svg
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
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
                        placeholder="Buscar por nombre o código..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200/60 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:text-base"
                    />
                </div>
            </div>

            {/* Chips de filtro */}
            <div className="flex flex-wrap gap-2">
                {[
                    { key: "todos", label: "Todos", tone: "slate" },
                    { key: "bajo", label: "Stock bajo", tone: "amber" },
                    { key: "sin_stock", label: "Sin stock", tone: "rose" },
                ].map((chip) => {
                    const active = filtroEstado === chip.key;
                    const tones = {
                        slate: active
                            ? "bg-slate-800 text-white"
                            : "bg-white text-slate-700 border-slate-200/60 hover:bg-slate-50",
                        amber: active
                            ? "bg-amber-500 text-white"
                            : "bg-white text-amber-700 border-amber-200/60 hover:bg-amber-50",
                        rose: active
                            ? "bg-rose-500 text-white"
                            : "bg-white text-rose-700 border-rose-200/60 hover:bg-rose-50",
                    };
                    return (
                        <button
                            key={chip.key}
                            onClick={() => setFiltroEstado(chip.key)}
                            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 ${tones[chip.tone]}`}
                        >
                            {chip.label}
                            <span
                                className={`rounded-full px-1.5 text-[10px] font-semibold ${
                                    active
                                        ? "bg-white/20"
                                        : "bg-slate-100 text-slate-600"
                                }`}
                            >
                                {counts[chip.key]}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Grid de stock */}
            {loading ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
            ) : stockFiltrado.length === 0 ? (
                <EmptyState
                    icon="🗂️"
                    title="Sin resultados"
                    description={
                        busqueda
                            ? "No encontramos productos con esa búsqueda"
                            : "No hay productos en el stock"
                    }
                />
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {stockFiltrado.map((item) => (
                        <div
                            key={item.id}
                            className="group rounded-2xl border border-slate-200/60 bg-white p-3.5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md sm:p-4"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    {item.codigo && (
                                        <p className="font-mono text-[10px] uppercase tracking-wide text-slate-400">
                                            {item.codigo}
                                        </p>
                                    )}
                                    <h3 className="mt-0.5 truncate text-sm font-semibold text-slate-800">
                                        {item.nombre}
                                    </h3>
                                </div>
                                <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getEstadoBadge(
                                        item.estado
                                    )}`}
                                >
                                    {getEstadoLabel(item.estado)}
                                </span>
                            </div>

                            <div className="mt-4 flex items-end justify-between">
                                <div>
                                    <p
                                        className={`text-3xl font-semibold tabular-nums ${getStockColor(
                                            item.estado
                                        )}`}
                                    >
                                        {item.stock}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {item.producto?.unidad || "unidades"}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                        Mínimo
                                    </p>
                                    <p className="text-sm font-medium text-slate-600 tabular-nums">
                                        {item.stockMin}
                                    </p>
                                </div>
                            </div>

                            {item.producto?.precio_referencia != null && (
                                <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                                    Ref:{" "}
                                    <span className="font-medium text-slate-700">
                                        {formatCLP(
                                            item.producto.precio_referencia
                                        )}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default StockActual;
