import { stockConProductos } from "../lib/bodegaUtils";
import { useMovimientoBodega } from "../hooks/useMovimientoBodega";
import { useCallback } from "react";
import { leerCatalogoBodega } from "../lib/bodegaData";
import EntradaForm from "../components/forms/EntradaForm";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";

function NuevaEntrada() {
    const { showToast } = useToast();

    const cargarProductos = useCallback(async () => {
        const [productos, stock] = await Promise.all([
            leerCatalogoBodega("productos", { soloActivos: true }),
            leerCatalogoBodega("stock_actual"),
        ]);
        return stockConProductos(productos, stock).sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, []);

    const { data: productos = [], loading, error, refetch } = useAsync(cargarProductos, {
        errorContexto: "cargar productos",
        onError: (err) => showToast(err.message, "error"),
    });

    const registrarMovimiento = useMovimientoBodega();
    const guardarEntrada = async (entrada) => {
        const ok = await registrarMovimiento(entrada);
        if (ok) await refetch();
        return ok;
    };

    return (
        <div className="space-y-6">
            <PageHeader
                icon="⬇️"
                title="Ingresar compra o stock"
                subtitle="Registra un ingreso de stock a la bodega"
            />

            <div className="grid gap-4 lg:grid-cols-3 sm:gap-6">
                <div className="lg:col-span-2">
                    {error && <div role="alert" className="mb-3 rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error.message}<button onClick={refetch} className="ml-3 min-h-[44px] underline">Reintentar</button></div>}
                    {loading && <p role="status" className="mb-3 text-sm text-slate-500">Actualizando productos y existencias…</p>}
                    <EntradaForm
                        productos={productos}
                        onGuardar={guardarEntrada}
                    />
                </div>

                <div className="space-y-4">
                    <Card>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            💡 ¿Qué es una entrada?
                        </h3>
                        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-neutral-400">
                            Las entradas suman unidades al stock. Usa este
                            formulario para compras a proveedores, conteos
                            iniciales o ajustes de inventario.
                        </p>
                    </Card>

                    <Card>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            📋 Tipos de ingreso
                        </h3>
                        <ul className="mt-2 space-y-1.5 text-xs text-slate-500 dark:text-neutral-400">
                            <li>
                                <span className="font-medium text-slate-700 dark:text-slate-200">
                                    Compra
                                </span>{" "}
                                — requiere proveedor y N° de documento.
                            </li>
                            <li>
                                <span className="font-medium text-slate-700 dark:text-slate-200">
                                    Stock inicial
                                </span>{" "}
                                — para cargar el conteo al implementar el
                                sistema.
                            </li>
                            <li>
                                <span className="font-medium text-slate-700 dark:text-slate-200">
                                    Ajuste positivo
                                </span>{" "}
                                — diferencias detectadas en conteo físico.
                            </li>
                            <li>
                                <span className="font-medium text-slate-700 dark:text-slate-200">
                                    Devolución
                                </span>{" "}
                                — usa la pestaña Devoluciones y selecciona el retiro original.
                            </li>
                        </ul>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default NuevaEntrada;
