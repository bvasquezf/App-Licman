import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import SalidaForm from "../components/forms/SalidaForm";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { useToast } from "../context/ToastContext";

function NuevaSalida() {
  const [productos, setProductos] = useState([]);
  const [stockActual, setStockActual] = useState({});
  const [loadingStock, setLoadingStock] = useState(true);
  const { showToast } = useToast();

  const cargarDatos = async () => {
    setLoadingStock(true);
    const [productosRes, stockRes] = await Promise.all([
      supabase
        .from("productos")
        .select("*")
        .eq("activo", true)
        .order("nombre", { ascending: true }),
      supabase.from("stock_actual").select("id, stock"),
    ]);

    if (productosRes.error) {
      console.error("Error al cargar productos:", productosRes.error);
      showToast("Error al cargar productos", "error");
    } else {
      setProductos(productosRes.data || []);
    }

    if (!stockRes.error) {
      // Convertir a un mapa { productoId: { stock } }
      const mapa = (stockRes.data || []).reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {});
      setStockActual(mapa);
    }
    setLoadingStock(false);
  };

  const guardarSalida = async (salida) => {
    const stockInfo = stockActual[salida.producto_id];

    if (stockInfo && Number(salida.cantidad) > Number(stockInfo.stock)) {
      showToast(
        `Stock insuficiente. Disponible: ${stockInfo.stock}, solicitado: ${salida.cantidad}`,
        "error"
      );
      return false;
    }

    const { error } = await supabase.from("movimientos").insert([salida]);

    if (error) {
      console.error("Error al registrar salida:", error);
      const mensaje = error.message?.includes("Stock insuficiente")
        ? error.message
        : "Error al registrar salida";
      showToast(mensaje, "error");
      return false;
    }

    // Actualizar el stock local para reflejar la salida
    setStockActual((prev) => ({
      ...prev,
      [salida.producto_id]: {
        ...(prev[salida.producto_id] || { id: salida.producto_id }),
        stock: Math.max(
          0,
          (prev[salida.producto_id]?.stock ?? 0) - Number(salida.cantidad)
        ),
      },
    }));

    showToast("Salida registrada correctamente");
    return true;
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Productos con stock disponible (ordenados por nombre)
  const productosConStock = productos
    .map((p) => ({
      ...p,
      stock: stockActual[p.id]?.stock ?? 0,
    }))
    .sort((a, b) => b.stock - a.stock);

  const productosSinStock = productosConStock.filter((p) => p.stock <= 0);
  const productosConStockDisponible = productosConStock.filter(
    (p) => p.stock > 0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon="⬆️"
        title="Nueva salida"
        subtitle="Registra un egreso de stock desde la bodega"
      />

      <div className="grid gap-4 lg:grid-cols-3 sm:gap-6">
        <div className="lg:col-span-2">
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
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
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
                {productosConStockDisponible.slice(0, 8).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-slate-700 dark:text-slate-200">
                        {p.nombre}
                      </p>
                      {p.codigo && (
                        <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                          {p.codigo}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${
                        p.stock <= p.stock_minimo
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                      }`}
                    >
                      {p.stock}
                    </span>
                  </li>
                ))}
                {productosSinStock.length > 0 && (
                  <li className="border-t border-slate-100 pt-2 dark:border-slate-800">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Sin stock ({productosSinStock.length})
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      No se pueden retirar hasta que registres un ingreso.
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
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              El sistema valida automáticamente que la cantidad no supere el
              stock disponible. Si ves el campo en rojo, reduce la cantidad.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default NuevaSalida;
