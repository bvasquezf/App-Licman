import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import EntradaForm from "../components/forms/EntradaForm";
import { useToast } from "../context/ToastContext";

function NuevaEntrada() {
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

  const guardarEntrada = async (entrada) => {
    const { error } = await supabase.from("movimientos").insert([entrada]);

    if (error) {
      console.error("Error al guardar entrada:", error);
      showToast("Error al guardar ingreso", "error");
      return false;
    }

    showToast("Ingreso registrado correctamente");
    return true;
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <EntradaForm productos={productos} onGuardar={guardarEntrada} />
    </div>
  );
}

export default NuevaEntrada;
