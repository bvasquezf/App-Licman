import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { exportWorkbook } from "../utils/exportWorkbook";
import { useToast } from "../context/ToastContext";

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

  const getTipoBadge = (tipo) => {
    if (tipo === "entrada") return "bg-teal-100 text-teal-700";
    if (tipo === "salida") return "bg-rose-100 text-rose-700";
    return "bg-amber-100 text-amber-700";
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="rounded-xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Cargando dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-slate-800 md:text-3xl">
          Dashboard
        </h1>

        <button
          onClick={exportarReporteMaestro}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 md:w-auto"
        >
          Exportar reporte
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Total productos
          </p>
          <p className="mt-1 text-3xl font-semibold text-indigo-600">
            {totalProductos}
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Stock bajo mínimo
          </p>
          <p className="mt-1 text-3xl font-semibold text-rose-500">
            {stockBajo.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Valor inventario estimado
          </p>
          <p className="mt-1 text-3xl font-semibold text-teal-600">
            {new Intl.NumberFormat("es-CL", {
              style: "currency",
              currency: "CLP",
              maximumFractionDigits: 0,
            }).format(valorInventario)}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Basado solo en productos con precio asignado
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Productos sin precio
          </p>
          <p className="mt-1 text-3xl font-semibold text-amber-500">
            {productosSinPrecio.length}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-700">
            Productos con stock bajo
          </h2>

          {stockBajo.length === 0 ? (
            <p className="text-sm text-slate-400">Todo en orden 👍</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {stockBajo.map((item) => {
                const producto = productos.find((p) => p.id === item.id);

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {producto?.nombre}
                      </p>
                      <p className="text-xs text-slate-400">
                        Stock actual: {item.stock}
                      </p>
                    </div>

                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">
                      Mínimo: {producto?.stock_minimo}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-700">
            Últimos movimientos
          </h2>

          {movimientos.length === 0 ? (
            <p className="text-sm text-slate-400">No hay movimientos visibles.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {movimientos.slice(0, 5).map((mov) => (
                <div key={mov.id} className="flex items-center gap-3 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getTipoBadge(
                      mov.tipo_movimiento
                    )}`}
                  >
                    {mov.tipo_movimiento}
                  </span>

                  <div className="flex-1">
                    <p className="text-sm text-slate-700">
                      {mov.productos?.nombre}
                    </p>
                    <p className="text-xs text-slate-400">{mov.fecha}</p>
                  </div>

                  <span className="text-sm font-medium text-slate-500">
                    ×{mov.cantidad}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;