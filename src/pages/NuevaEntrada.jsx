import { useCallback } from "react";
import { supabase } from "../services/supabase";
import EntradaForm from "../components/forms/EntradaForm";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { withRetry } from "../utils/withRetry";

function NuevaEntrada() {
    const { showToast } = useToast();

    const cargarProductos = useCallback(
        () =>
            withRetry(() =>
                supabase
                    .from("productos")
                    .select("*")
                    .eq("activo", true)
                    .order("nombre", { ascending: true })
            ).then((res) => res.data || []),
        []
    );

    const { data: productos = [] } = useAsync(cargarProductos, {
        errorContexto: "cargar productos",
        onError: (err) => showToast(err.message, "error"),
    });

    const guardarEntrada = async (entrada) => {
        const { error } = await supabase
            .from("movimientos")
            .insert([entrada]);

        if (error) {
            console.error("Error al guardar entrada:", error);
            showToast(
                "No se pudo registrar el ingreso. Inténtalo de nuevo.",
                "error"
            );
            return false;
        }

        showToast("Ingreso registrado correctamente");
        return true;
    };

    return (
        <div className="space-y-6">
            <PageHeader
                icon="⬇️"
                title="Nueva entrada"
                subtitle="Registra un ingreso de stock a la bodega"
            />

            <div className="grid gap-4 lg:grid-cols-3 sm:gap-6">
                <div className="lg:col-span-2">
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
                        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                            Las entradas suman unidades al stock. Usá este
                            formulario para compras a proveedores, conteos
                            iniciales, devoluciones o ajustes de inventario.
                        </p>
                    </Card>

                    <Card>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            📋 Tipos de ingreso
                        </h3>
                        <ul className="mt-2 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
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
                                — material que vuelve a bodega desde terreno.
                            </li>
                        </ul>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default NuevaEntrada;
