import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { exportToExcel } from "../utils/exportToExcel";
import { useToast } from "../context/ToastContext";

function Historial() {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const { showToast } = useToast();

  const cargarMovimientos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("movimientos")
      .select(`id, tipo_movimiento, cantidad, precio_unitario, proveedor, numero_documento, solicitante, destino, observacion, fecha, productos (nombre, codigo)`)
      .order("id", { ascending: false });
    if (error) { console.error(error); showToast("Error al cargar historial", "error"); setLoading(false); return; }
    setMovimientos(data || []);
    setLoading(false);
  };

  const exportarHistorial = () => {
    const dataExport = movimientos.map((mov) => ({
      ID: mov.id, Fecha: mov.fecha || "", Tipo: mov.tipo_movimiento || "",
      Código: mov.productos?.codigo || "", Producto: mov.productos?.nombre || "",
      Cantidad: mov.cantidad ?? 0, "Precio unitario": mov.precio_unitario ?? 0,
      Proveedor: mov.proveedor || "", Documento: mov.numero_documento || "",
      Solicitante: mov.solicitante || "", Destino: mov.destino || "", Observación: mov.observacion || "",
    }));
    const ok = exportToExcel(dataExport, "historial_movimientos_bodega", "Historial");
    if (!ok) showToast("No hay movimientos para exportar", "warning");
    else showToast("Reporte exportado");
  };

  useEffect(() => { cargarMovimientos(); }, []);

  const getTipoBadge = (tipo) => {
    if (tipo === "entrada") return "bg-teal-100 text-teal-700";
    if (tipo === "salida") return "bg-rose-100 text-rose-700";
    return "bg-amber-100 text-amber-700";
  };

  const movimientosFiltrados = movimientos.filter((mov) => {
    const cumpleDesde = fechaDesde ? mov.fecha >= fechaDesde : true;
    const cumpleHasta = fechaHasta ? mov.fecha <= fechaHasta : true;
    return cumpleDesde && cumpleHasta;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Historial de movimientos</h1>
        <button
          onClick={exportarHistorial}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Exportar Excel
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 rounded-xl bg-white p-4 shadow-sm border border-slate-100">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">Desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
          />
        </div>
        {(fechaDesde || fechaHasta) && (
          <div className="flex items-end">
            <button
              onClick={() => { setFechaDesde(""); setFechaHasta(""); }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="rounded-xl bg-white shadow-sm border border-slate-100">
        {loading ? (
          <p className="p-6 text-sm text-slate-400">Cargando historial...</p>
        ) : movimientosFiltrados.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">No hay movimientos en este período.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {movimientosFiltrados.map((mov) => (
              <div key={mov.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getTipoBadge(mov.tipo_movimiento)}`}>
                    {mov.tipo_movimiento.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-400">{mov.fecha}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800">{mov.productos?.nombre || "Producto sin nombre"}</p>
                <p className="text-xs text-slate-400 mb-2">Cód: {mov.productos?.codigo || "—"}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                  <span>Cantidad: <strong>{mov.cantidad}</strong></span>
                  {mov.precio_unitario ? <span>Precio: ${Number(mov.precio_unitario).toLocaleString("es-CL")}</span> : null}
                  {mov.proveedor && <span>Proveedor: {mov.proveedor}</span>}
                  {mov.numero_documento && <span>Doc: {mov.numero_documento}</span>}
                  {mov.solicitante && <span>Solicitante: {mov.solicitante}</span>}
                  {mov.destino && <span>Destino: {mov.destino}</span>}
                </div>
                {mov.observacion && (
                  <p className="mt-2 text-xs text-slate-400 italic">{mov.observacion}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Historial;