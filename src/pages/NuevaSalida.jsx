import { useCallback, useMemo, useState } from "react";
import { leerCatalogoBodega } from "../lib/bodegaData";
import SalidaForm from "../components/forms/SalidaForm";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { useMovimientoBodega } from "../hooks/useMovimientoBodega";

function NuevaSalida() {
    const { showToast } = useToast();
    // Stock local: se mantiene sincronizado con la carga inicial y
    // se actualiza in-place tras cada salida exitosa.
    const [stockActual, setStockActual] = useState({});

    const cargarDatos = useCallback(async () => {
        const [productos, stock] = await Promise.all([
            leerCatalogoBodega("productos", { soloActivos: true }),
            leerCatalogoBodega("stock_actual"),
        ]);

        // Sincronizamos el stock local con el remoto.
        const mapa = stock.reduce((acc, item) => {
            acc[item.id] = item;
            return acc;
        }, {});
        setStockActual(mapa);

        return productos.sort((a,b) => a.nombre.localeCompare(b.nombre));
    }, []);

    const {
        data: productos = [],
        loading: loadingStock,
        error,
        refetch,
    } = useAsync(cargarDatos, {
        errorContexto: "cargar datos de salida",
        onError: (err) => showToast(err.message, "error"),
    });

    const registrarMovimiento = useMovimientoBodega();
    const guardarSalida = async (salida) => {
        const ok = await registrarMovimiento(salida);
        if (ok) await refetch();
        return ok;
    };

    // Productos con stock disponible (ordenados por nombre)
    const productosConStock = useMemo(
        () =>
            productos
                .map((p) => ({
                    ...p,
                    stock: stockActual[p.id]?.stock ?? 0,
                }))
                .sort((a, b) => b.stock - a.stock),
        [productos, stockActual]
    );

    const productosSinStock = productosConStock.filter((p) => p.stock <= 0);
    const productosConStockDisponible = productosConStock.filter(
        (p) => p.stock > 0
    );

    return (
        <div className="space-y-6">
            <PageHeader
                icon="⬆️"
                title="Retirar productos"
                subtitle="Registra un egreso de stock desde la bodega"
            />

            <div className="grid gap-4 lg:grid-cols-3 sm:gap-6">
                <div className="lg:col-span-2">
                    {error && <div role="alert" className="mb-3 rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error.message}<button onClick={refetch} className="ml-3 min-h-[44px] underline">Reintentar</button></div>}
                    {loadingStock && <p role="status" className="mb-3 text-sm text-slate-500">Actualizando productos y existencias…</p>}
                    <SalidaForm
                        productos={productos}
                        stockActual={stockActual}
                        onGuardar={guardarSalida}
                    />
                </div>

                <div className="space-y-4">
                    <Card padding="p-4 sm:p-5">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                📦 Stock en bodega
                            </h3>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-neutral-300">
                                {productosConStock.length}
                            </span>
                        </div>

                        {loadingStock ? (
                            <div className="space-y-2">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <Skeleton key={i} className="h-9" />
                                ))}
                            </div>
                        ) : productosConStock.length === 0 ? (
                            <EmptyState
                                icon="📦"
                                title="Sin productos"
                                description="Crea productos antes de registrar salidas"
                            />
                        ) : (
                            <ul className="max-h-72 space-y-1.5 overflow-y-auto">
                                {productosConStockDisponible
                                    .slice(0, 8)
                                    .map((p) => (
                                        <li
                                            key={p.id}
                                            className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-white/5"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-slate-700 dark:text-slate-200">
                                                    {p.nombre}
                                                </p>
                                                {p.codigo && (
                                                    <p className="font-mono text-xs text-slate-500 dark:text-neutral-400">
                                                        {p.codigo}
                                                    </p>
                                                )}
                                            </div>
                                            <span
                                                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                                                    p.stock <= p.stock_minimo
                                                        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                                                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                                }`}
                                            >
                                                {p.stock} {p.unidad}
                                            </span>
                                        </li>
                                    ))}
                                {productosSinStock.length > 0 && (
                                    <li className="border-t border-slate-100 pt-2 dark:border-white/10">
                                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                                            Sin stock ({productosSinStock.length})
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                                            No se pueden retirar hasta que
                                            registres un ingreso.
                                        </p>
                                    </li>
                                )}
                            </ul>
                        )}
                    </Card>

                    <Card>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            💡 Tip
                        </h3>
                        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-neutral-400">
                            El sistema valida automáticamente que la cantidad no
                            supere el stock disponible. Si ves el campo en
                            rojo, reduce la cantidad.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default NuevaSalida;
