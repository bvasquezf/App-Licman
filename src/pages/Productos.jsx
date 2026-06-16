import { useEffect, useState } from "react";
import ProductoForm from "../components/forms/ProductoForm";
import { supabase } from "../services/supabase";
import { exportToExcel } from "../utils/exportToExcel";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";

const formatCLP = (value) =>
    new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
    }).format(value || 0);

function Productos() {
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [productoEditar, setProductoEditar] = useState(null);
    const [mostrarInactivos, setMostrarInactivos] = useState(false);
    const [busqueda, setBusqueda] = useState("");
    const { showToast } = useToast();

    const cargarProductos = async () => {
        setLoading(true);

        let query = supabase
            .from("productos")
            .select("*")
            .order("id", { ascending: false });

        if (!mostrarInactivos) {
            query = query.eq("activo", true);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error al cargar productos:", error);
            showToast("Error al cargar productos", "error");
            setLoading(false);
            return;
        }

        setProductos(data || []);
        setLoading(false);
    };

    const guardarProducto = async (payload) => {
        const { producto, stockInicial } = payload;

        if (productoEditar) {
            const { error } = await supabase
                .from("productos")
                .update(producto)
                .eq("id", productoEditar.id);

            if (error) {
                console.error("Error al actualizar producto:", error);
                showToast("Hubo un error al actualizar el producto", "error");
                return;
            }

            showToast("Producto actualizado correctamente");
            setProductoEditar(null);
            await cargarProductos();
            return;
        }

        const { data: productoInsertado, error } = await supabase
            .from("productos")
            .insert([{ ...producto, activo: true }])
            .select()
            .single();

        if (error) {
            console.error("Error al guardar producto:", error);
            showToast("Hubo un error al guardar el producto", "error");
            return;
        }

        if (stockInicial && stockInicial.cantidad > 0) {
            const movimientoPayload = {
                producto_id: productoInsertado.id,
                tipo_movimiento: "entrada",
                motivo_movimiento: "stock_inicial",
                cantidad: stockInicial.cantidad,
                precio_unitario: stockInicial.precio_unitario ?? null,
                observacion:
                    stockInicial.observacion ?? "Stock inicial del producto",
            };

            const { error: movError } = await supabase
                .from("movimientos")
                .insert([movimientoPayload]);

            if (movError) {
                console.error(
                    "Error al registrar stock inicial:",
                    movError
                );
                showToast(
                    `Producto creado, pero falló el stock inicial: ${movError.message}`,
                    "error"
                );
                await cargarProductos();
                return;
            }

            showToast("Producto creado con stock inicial");
        } else {
            showToast("Producto guardado correctamente");
        }

        await cargarProductos();
    };

    const desactivarProducto = async (producto) => {
        const confirmar = window.confirm(
            `¿Seguro que deseas desactivar "${producto.nombre}"?`
        );

        if (!confirmar) return;

        const { error } = await supabase
            .from("productos")
            .update({ activo: false })
            .eq("id", producto.id);

        if (error) {
            console.error("Error al desactivar producto:", error);
            showToast("No se pudo desactivar el producto", "error");
            return;
        }

        showToast("Producto desactivado correctamente");

        if (productoEditar?.id === producto.id) {
            setProductoEditar(null);
        }

        await cargarProductos();
    };

    const activarProducto = async (producto) => {
        const { error } = await supabase
            .from("productos")
            .update({ activo: true })
            .eq("id", producto.id);

        if (error) {
            console.error("Error al activar producto:", error);
            showToast("No se pudo activar el producto", "error");
            return;
        }

        showToast("Producto activado correctamente");
        await cargarProductos();
    };

    const exportarProductos = () => {
        if (productos.length === 0) {
            showToast("No hay productos para exportar", "warning");
            return;
        }

        const dataExport = productos.map((producto) => ({
            ID: producto.id,
            Código: producto.codigo || "",
            Nombre: producto.nombre || "",
            Categoría: producto.categoria || "",
            Unidad: producto.unidad || "",
            "Stock mínimo": producto.stock_minimo || 0,
            "Precio referencia": producto.precio_referencia ?? "Sin precio",
            Estado: producto.activo ? "Activo" : "Inactivo",
        }));

        exportToExcel(dataExport, "productos_bodega", "Productos");
        showToast("Reporte exportado");
    };

    const productosFiltrados = productos.filter((producto) => {
        const texto = busqueda.toLowerCase();
        return (
            producto.nombre?.toLowerCase().includes(texto) ||
            producto.codigo?.toLowerCase().includes(texto) ||
            producto.categoria?.toLowerCase().includes(texto)
        );
    });

    useEffect(() => {
        cargarProductos();
    }, [mostrarInactivos]);

    return (
        <div className="space-y-6">
            <PageHeader
                icon="📦"
                title="Productos"
                subtitle="Crea y administra la ficha de cada producto"
                actions={
                    <>
                        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50">
                            <input
                                type="checkbox"
                                checked={mostrarInactivos}
                                onChange={(e) =>
                                    setMostrarInactivos(e.target.checked)
                                }
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            Inactivos
                        </label>
                        <button
                            onClick={exportarProductos}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-slate-900 hover:shadow-md active:scale-95"
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
                            Excel
                        </button>
                    </>
                }
            />

            {/* Búsqueda */}
            <div className="relative">
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
                    placeholder="Buscar por nombre, código o categoría..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200/60 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:text-base"
                />
            </div>

            <ProductoForm
                onGuardar={guardarProducto}
                productoEditar={productoEditar}
                onCancelarEdicion={() => setProductoEditar(null)}
            />

            {/* Listado */}
            <Card padding="p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between sm:mb-4">
                    <h2 className="text-base font-semibold text-slate-800">
                        Listado
                    </h2>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        {productosFiltrados.length}
                    </span>
                </div>

                {loading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-20" />
                        ))}
                    </div>
                ) : productosFiltrados.length === 0 ? (
                    <EmptyState
                        icon="📦"
                        title="No hay productos"
                        description="Crea tu primer producto con el formulario de arriba"
                    />
                ) : (
                    <ul className="space-y-2 sm:space-y-3">
                        {productosFiltrados.map((producto) => (
                            <li
                                key={producto.id}
                                className={`group rounded-2xl border p-3 transition-all duration-200 hover:shadow-sm sm:p-4 ${
                                    producto.activo
                                        ? "border-slate-200/60 bg-white"
                                        : "border-amber-200/60 bg-amber-50/40"
                                }`}
                            >
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="truncate text-sm font-semibold text-slate-800 sm:text-base">
                                                {producto.nombre}
                                            </h3>
                                            {producto.codigo && (
                                                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                                                    {producto.codigo}
                                                </span>
                                            )}
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-xs ${
                                                    producto.activo
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : "bg-amber-100 text-amber-800"
                                                }`}
                                            >
                                                {producto.activo
                                                    ? "Activo"
                                                    : "Inactivo"}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 sm:text-xs">
                                            {producto.categoria && (
                                                <span>📁 {producto.categoria}</span>
                                            )}
                                            {producto.unidad && (
                                                <span>📏 {producto.unidad}</span>
                                            )}
                                            <span>
                                                📊 Mín: {producto.stock_minimo}
                                            </span>
                                            {producto.precio_referencia !=
                                            null ? (
                                                <span className="font-medium text-slate-700">
                                                    💰 {formatCLP(producto.precio_referencia)}
                                                </span>
                                            ) : (
                                                <span className="text-amber-600">
                                                    💰 Sin precio
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                        <button
                                            onClick={() =>
                                                setProductoEditar(producto)
                                            }
                                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50 sm:px-3"
                                        >
                                            Editar
                                        </button>
                                        {producto.activo ? (
                                            <button
                                                onClick={() =>
                                                    desactivarProducto(producto)
                                                }
                                                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-50 sm:px-3"
                                            >
                                                Desactivar
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() =>
                                                    activarProducto(producto)
                                                }
                                                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-50 sm:px-3"
                                            >
                                                Activar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}

export default Productos;
