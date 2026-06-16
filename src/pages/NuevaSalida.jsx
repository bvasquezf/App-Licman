import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import SalidaForm from "../components/forms/SalidaForm";
import { useToast } from "../context/ToastContext";

function NuevaSalida() {
    const [productos, setProductos] = useState([]);
    const { showToast } = useToast();

    const cargarProductos = async () => {
        const { data, error } = await supabase
            .from("productos")
            .select("*")
            .eq("activo", true)
            .order("nombre", { ascending: true });

        if (error) {
            console.error("Error al cargar productos:", error);
            showToast("Error al cargar productos", "error");
            return;
        }

        setProductos(data || []);
    };

    const obtenerStockProducto = async (productoId) => {
        const { data, error } = await supabase
            .from("stock_actual")
            .select("*")
            .eq("id", productoId)
            .single();

        if (error) {
            console.error("Error al consultar stock:", error);
            return null;
        }

        return data;
    };

    const guardarSalida = async (salida) => {
        const stockInfo = await obtenerStockProducto(salida.producto_id);

        if (!stockInfo) {
            showToast("No se pudo validar el stock del producto", "error");
            return false;
        }

        if (Number(salida.cantidad) > Number(stockInfo.stock)) {
            showToast(
                `Stock insuficiente. Disponible: ${stockInfo.stock}, solicitado: ${salida.cantidad}`,
                "error"
            );
            return false;
        }

        const { error } = await supabase.from("movimientos").insert([salida]);

        if (error) {
            console.error("Error al registrar salida:", error);
            // Si el trigger de Supabase detecta stock insuficiente,
            // el error llega acá y lo mostramos amigablemente.
            const mensaje = error.message?.includes("Stock insuficiente")
                ? error.message
                : "Error al registrar salida";
            showToast(mensaje, "error");
            return false;
        }

        showToast("Salida registrada correctamente");
        return true;
    };

    useEffect(() => {
        cargarProductos();
    }, []);

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <SalidaForm productos={productos} onGuardar={guardarSalida} />
        </div>
    );
}

export default NuevaSalida;
