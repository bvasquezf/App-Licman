import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import EntradaForm from "../components/forms/EntradaForm";

function NuevaEntrada() {
  const [productos, setProductos] = useState([]);

  const cargarProductos = async () => {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error al cargar productos:", error);
      alert("Error al cargar productos");
      return;
    }

    setProductos(data || []);
  };

  const guardarEntrada = async (entrada) => {
    const { error } = await supabase.from("movimientos").insert([entrada]);

    if (error) {
      console.error("Error al guardar entrada:", error);
      alert("Error al guardar ingreso");
      return false;
    }

    alert("Ingreso registrado correctamente");
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