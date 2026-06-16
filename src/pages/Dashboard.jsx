import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { exportWorkbook } from "../utils/exportWorkbook";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";

function Dashboard() {
    const [productos, setProductos] = useState([]);
    const [stock, setStock] = useState([]);
    const [movimientos, setMovimientos] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    const cargarData = async () => {
        setLoading(true);

        const { data: productosData, error: productosError } = await supabase
            .from("productos")
            .select("*");

        const { data: stockData, error: stockError } = await supabase
            .from("stock_actual")
            .select("*");

        const { data: movimientosData, error: movimientosError } = await supabase
            .from("movimientos")
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
                productos (nombre, codigo)
            `)
            .order("id", { ascending: false });

        if (productosError) console.error("Error productos:", productosError);
        if (stockError) console.error("Error stock:", stockError);
        if (movimientosError) console.error("Error movimientos:", movimientosError);

        setProductos(productosData || []);
        setStock(stockData || []);
        setMovimientos(movimientosData || []);
        setLoading(false);
    };

    useEffect(() => {
        cargarData();
    }, []);

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
                { name: "Historial", data: historialSheet },
            ],
            "reporte_maestro_bodega"
        );
        showToast("Reporte maestro exportado");
    };

    const formatCLP = (value) =>
        new Intl.NumberFormat("es-CL", {
            style: "currency",
            currency: "CLP",
            maximumFractionDigits: 0,
        }).format(value);

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
                title="Dashboard"
                subtitle="Vista general del inventario"
                actions={
                    <button
                        onClick={exportarReporteMaestro}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:shadow-md active:scale-95"
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
                        >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Exportar reporte
                    </button>
                }
            />

            {/* KPIs */}
            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-28" />
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Total productos"
                        value={totalProductos.toLocaleString("es-CL")}
                        icon="📦"
                        tone="indigo"
                    />
                    <StatCard
                        label="Stock bajo mínimo"
                        value={stockBajo.length.toLocaleString("es-CL")}
                        icon="⚠️"
                        tone="rose"
                    />
                    <StatCard
                        label="Valor inventario"
                        value={formatCLP(valorInventario)}
                        hint="Solo productos con precio"
                        icon="💰"
                        tone="emerald"
                    />
                    <StatCard
                        label="Sin precio"
                        value={productosSinPrecio.length.toLocaleString("es-CL")}
                        icon="🏷️"
                        tone="amber"
                    />
                </div>
            )}

            {/* Secciones */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Stock bajo */}
                <Card>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-base font-semibold text-slate-800">
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
                        <ul className="divide-y divide-slate-100">
                            {stockBajo.slice(0, 6).map((item) => {
                                const producto = productos.find(
                                    (p) => p.id === item.id
                                );
                                return (
                                    <li
                                        key={item.id}
                                        className="flex items-center justify-between py-3"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-slate-800">
                                                {producto?.nombre}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Stock: {item.stock}
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

                {/* Últimos movimientos */}
                <Card>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-base font-semibold text-slate-800">
                            Últimos movimientos
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
                        <ul className="divide-y divide-slate-100">
                            {movimientos.slice(0, 5).map((mov) => (
                                <li
                                    key={mov.id}
                                    className="flex items-center gap-3 py-3"
                                >
                                    <span
                                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${getTipoBadge(
                                            mov.tipo_movimiento
                                        )}`}
                                    >
                                        {mov.tipo_movimiento}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-slate-800">
                                            {mov.productos?.nombre}
                                        </p>
                                        <p className="text-xs text-slate-500">
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
                                        {mov.cantidad}
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
