import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { exportToExcel } from "../utils/exportToExcel";
import { useToast } from "../context/ToastContext";

function StockActual() {
  const [stock, setStock] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const { showToast } = useToast();

  const cargarStock = async () => {
    const { data, error } = await supabase.from("stock_actual").select("*").order("nombre", { ascending: true });
    if (error) { console.error(error); showToast("Error al cargar stock", "error"); return; }
    setStock(data || []);
  };

  const exportarStock = () => {
    const dataExport = stock.map((item) => ({
      ID: item.id, Código: item.codigo || "", Nombre: item.nombre || "", Stock: item.stock ?? 0,
    }));
    const ok = exportToExcel(dataExport, "stock_actual_bodega", "Stock");
    if (!ok) showToast("No hay stock para exportar", "warning");
    else showToast("Reporte exportado");
  };

  useEffect(() => { cargarStock(); }, []);

  const stockFiltrado = stock.filter((item) =>
    item.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    item.codigo?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Stock actual</h1>
        <button
          onClick={exportarStock}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Exportar Excel
        </button>
      </div>

      <input
        type="text"
        placeholder="Buscar por nombre o código..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none md:w-80"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stockFiltrado.map((item) => (
          <div key={item.id} className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400 mb-1">{item.codigo || "Sin código"}</p>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">{item.nombre}</h3>
            <p className="text-2xl font-semibold text-indigo-600">{item.stock}</p>
            <p className="text-xs text-slate-400 mt-0.5">unidades en stock</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StockActual;