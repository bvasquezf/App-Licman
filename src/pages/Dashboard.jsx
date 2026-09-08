import { leerCatalogoBodega } from "../lib/bodegaData";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { stockConProductos, cantidadBodega } from "../lib/bodegaUtils";
import { useCallback } from "react";
import { supabase } from "../services/supabase";
import { exportWorkbook } from "../utils/exportWorkbook";
import { formatCLP } from "../utils/format";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { useCountUp } from "../hooks/useCountUp";
import { withRetry } from "../utils/withRetry";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";

function Dashboard() {
    const { showToast } = useToast();
    const { puede } = useAuth();

    const cargarData = useCallback(async () => {
        const [productosRes, stockRes, movimientosRes] = await Promise.all([
            leerCatalogoBodega("productos", { soloActivos: true }),
            leerCatalogoBodega("stock_actual"),
            withRetry(() =>
                supabase
                    .from("bodega_movimientos")
                    .select(`
                        id,
                        tipo_movimiento,
                        cantidad,
                        precio_unitario,
                        proveedor,
                        numero_documento,
                        solicitante,
                        destino,
                        observacion,
                        fecha,
                        productos (nombre, codigo, unidad)
                    `)
                    .order("id", { ascending: false }).limit(5)
            ),
        ]);

        if (movimientosRes.error) throw movimientosRes.error;

        return {
            productos: productosRes,
            stock: stockRes,
            movimientos: movimientosRes.data || [],
        };
    }, []);

    const { data, loading, error, refetch } = useAsync(cargarData, {
        errorContexto: "cargar el dashboard",
        onError: (err) => showToast(err.message, "error"),
    });

    const productos = (data?.productos || []).filter((p) => p.activo);
    const stock = stockConProductos(productos, data?.stock || []);
    const movimientos = data?.movimientos || [];

    const totalProductos = productos.length;

    const productosSinPrecio = productos.filter(
        (p) =>
            p.precio_referencia === null ||
            p.precio_referencia === undefined ||
            p.precio_referencia === ""
    );

    const stockBajo = stock.filter((item) => {
        const producto = productos.find((p) => p.id === item.id);
        return producto && item.stock <= producto.stock_minimo;
    });

    const valorInventario = stock.reduce((total, item) => {
        const producto = productos.find((p) => p.id === item.id);

        if (
            !producto ||
            producto.precio_referencia === null ||
            producto.precio_referencia === undefined ||
            producto.precio_referencia === ""
        ) {
            return total;
        }

        return total + item.stock * producto.precio_referencia;
    }, 0);

    // Valores animados: cuentan desde 0 (o el valor previo) al llegar la data
    const totalProductosAnim = useCountUp(totalProductos);
    const stockBajoAnim = useCountUp(stockBajo.length);
    const valorInventarioAnim = useCountUp(valorInventario, {
        format: formatCLP,
    });
    const sinPrecioAnim = useCountUp(productosSinPrecio.length);

    const exportarReporteMaestro = () => {
        const productosSheet = productos.map((p) => ({
            ID: p.id,
            Código: p.codigo || "",
            Nombre: p.nombre || "",
            Categoría: p.categoria || "",
            Unidad: p.unidad || "",
            "Stock mínimo": p.stock_minimo || 0,
            "Precio referencia": p.precio_referencia ?? "Sin precio",
            Estado: p.activo ? "Activo" : "Inactivo",
        }));

        const stockSheet = stock.map((item) => ({
            ID: item.id,
            Código: item.codigo || "",
            Nombre: item.nombre || "",
            Stock: item.stock ?? 0,
        }));

        const historialSheet = movimientos.map((mov) => ({
            ID: mov.id,
            Fecha: mov.fecha || "",
            Tipo: mov.tipo_movimiento || "",
            Código: mov.productos?.codigo || "",
            Producto: mov.productos?.nombre || "",
            Cantidad: mov.cantidad ?? 0,
            "Precio unitario": mov.precio_unitario ?? 0,
            Proveedor: mov.proveedor || "",
            Documento: mov.numero_documento || "",
            Solicitante: mov.solicitante || "",
            Destino: mov.destino || "",
            Observación: mov.observacion || "",
        }));

        exportWorkbook(
            [
                { name: "Productos", data: productosSheet },
                { name: "Stock", data: stockSheet },
                { name: "Actividad reciente (5)", data: historialSheet },
            ],
            "reporte_maestro_bodega"
        );
        showToast("Reporte maestro exportado");
    };

    const getTipoBadge = (tipo) => {
        if (tipo === "entrada")
            return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60";
        if (tipo === "salida")
            return "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60";
        return "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60";
    };

    return (
        <div className="space-y-6">
            <PageHeader
                icon="📊"
                title="Resumen de bodega"
                subtitle="Existencias del taller y reposición · actividad reciente según tu acceso"
                actions={
                    <button
                        onClick={exportarReporteMaestro}
                        className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[10px] bg-brand-600 px-3 py-2 text-xs font-medium text-white shadow-[0_2px_8px_rgba(232,18,26,0.28)] transition-all duration-200 hover:bg-brand-700 hover:shadow-md active:scale-95 sm:gap-2 sm:px-4 sm:text-sm"
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
                        <span className="hidden sm:inline">
                            Exportar reporte
                        </span>
                        <span className="sm:hidden">Reporte</span>
                    </button>
                }
            />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { to: "productos", permiso: "bodega.productos", title: "Crear producto", detail: "Nombre, unidad y mínimo de reposición" },
                    { to: "nueva-salida", permiso: "bodega.retirar", title: "Retirar productos", detail: "Repuestos y líquidos para el trabajo" },
                    { to: "devoluciones", permiso: "bodega.devolver", title: "Devolver sobrantes", detail: "Vinculados al retiro original" },
                    { to: "nueva-entrada", permiso: "bodega.ingresar", title: "Ingresar compra", detail: "Proveedor, documento y cantidad" },
                    { to: "reposicion", permiso: "bodega.usar", title: "Revisar por comprar", detail: "Productos que llegaron al mínimo" },
                ].filter((a) => puede(a.permiso)).map((a) => <Link key={a.to} to={`/bodega/${a.to}`} className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-white/10 dark:bg-carbon-900 dark:hover:bg-blue-500/10"><p className="font-semibold text-blue-700 dark:text-blue-300">{a.title} →</p><p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">{a.detail}</p></Link>)}
            </div>
            {error && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error.message}<button onClick={refetch} className="ml-3 min-h-[44px] underline">Reintentar</button></div>}
            {/* KPIs */}
            {loading ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 sm:h-28" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                    <div
                        className="animate-fade-in"
                        style={{ animationDelay: "0ms" }}
                    >
                        <StatCard
                            label="Total productos"
                            value={totalProductosAnim}
                            icon="📦"
                            tone="brand"
                        />
                    </div>
                    <div
                        className="animate-fade-in"
                        style={{ animationDelay: "60ms" }}
                    >
                        <StatCard
                            label="Stock bajo mínimo"
                            value={stockBajoAnim}
                            icon="⚠️"
                            tone="rose"
                        />
                    </div>
                    <div
                        className="animate-fade-in"
                        style={{ animationDelay: "120ms" }}
                    >
                        <StatCard
                            label="Valor inventario"
                            value={valorInventarioAnim}
                            hint="Solo productos con precio"
                            icon="💰"
                            tone="emerald"
                        />
                    </div>
                    <div
                        className="animate-fade-in"
                        style={{ animationDelay: "180ms" }}
                    >
                        <StatCard
                            label="Sin precio"
                            value={sinPrecioAnim}
                            icon="🏷️"
                            tone="amber"
                        />
                    </div>
                </div>
            )}

            {/* Secciones */}
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                {/* Stock bajo */}
                <Card
                    className="animate-fade-in"
                    style={{ animationDelay: "240ms" }}
                >
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                            Stock bajo mínimo
                        </h2>
                        <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                            {stockBajo.length}
                        </span>
                    </div>

                    {loading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-12" />
                            ))}
                        </div>
                    ) : stockBajo.length === 0 ? (
                        <EmptyState
                            icon="✅"
                            title="Todo en orden"
                            description="Ningún producto está bajo su stock mínimo"
                        />
                    ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-white/10">
                            {stockBajo.slice(0, 6).map((item) => {
                                const producto = productos.find(
                                    (p) => p.id === item.id
                                );
                                return (
                                    <li
                                        key={item.id}
                                        className="flex items-center justify-between py-2.5 sm:py-3"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                                                {producto?.nombre}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-neutral-400">
                                                Stock: {cantidadBodega(item.stock, item.unidad)}
                                            </p>
                                        </div>
                                        <span className="ml-3 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                                            Mín: {producto?.stock_minimo}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Card>

                {/* Últimos movimientos visibles */}
                <Card
                    className="animate-fade-in"
                    style={{ animationDelay: "320ms" }}
                >
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                            Últimos movimientos visibles
                        </h2>
                    </div>

                    {loading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-12" />
                            ))}
                        </div>
                    ) : movimientos.length === 0 ? (
                        <EmptyState
                            icon="📭"
                            title="Sin movimientos"
                            description="Aún no se han registrado movimientos"
                        />
                    ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-white/10">
                            {movimientos.slice(0, 5).map((mov) => (
                                <li
                                    key={mov.id}
                                    className="flex items-center gap-3 py-2.5 sm:py-3"
                                >
                                    <span
                                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${getTipoBadge(
                                            mov.tipo_movimiento
                                        )}`}
                                    >
                                        {mov.tipo_movimiento}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                                            {mov.productos?.nombre}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-neutral-400">
                                            {mov.fecha}
                                        </p>
                                    </div>
                                    <span
                                        className={`shrink-0 text-sm font-semibold tabular-nums ${
                                            mov.tipo_movimiento === "entrada"
                                                ? "text-emerald-600"
                                                : "text-rose-600"
                                        }`}
                                    >
                                        {mov.tipo_movimiento === "entrada"
                                            ? "+"
                                            : "−"}
                                        {cantidadBodega(mov.cantidad, mov.productos?.unidad)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </div>
    );
}

export default Dashboard;
