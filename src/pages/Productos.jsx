import { useEffect, useState } from "react";
import ProductoForm from "../components/forms/ProductoForm";
import { supabase } from "../services/supabase";
import { exportToExcel } from "../utils/exportToExcel";
import Toast from "../components/ui/Toast";

function Productos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productoEditar, setProductoEditar] = useState(null);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [toast, setToast] = useState({
    message: "",
    type: "success",
  });

  const mostrarToast = (message, type = "success") => {
    setToast({ message, type });

    setTimeout(() => {
      setToast({ message: "", type: "success" });
    }, 3000);
  };

  const cargarProductos = async () => {
    setLoading(true);

    let query = supabase
      .from("productos")
      .select("*")
      .order("id", { ascending: false });

    if (!mostrarInactivos) {
      query = query.eq("activo", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al cargar productos:", error);
      mostrarToast("Error al cargar productos", "error");
      setLoading(false);
      return;
    }

    setProductos(data || []);
    setLoading(false);
  };

  const guardarProducto = async (payload) => {
    const { producto, stockInicial } = payload;

    if (productoEditar) {
      const { error } = await supabase
        .from("productos")
        .update(producto)
        .eq("id", productoEditar.id);

      if (error) {
        console.error("Error al actualizar producto:", error);
        mostrarToast("Hubo un error al actualizar el producto", "error");
        return;
      }

      mostrarToast("Producto actualizado correctamente");
      setProductoEditar(null);
      await cargarProductos();
      return;
    }

    const { data: productoInsertado, error } = await supabase
      .from("productos")
      .insert([
        {
          ...producto,
          activo: true,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error al guardar producto:", error);
      mostrarToast("Hubo un error al guardar el producto", "error");
      return;
    }

    // Por ahora solo informamos si venía stock inicial.
    // En el siguiente paso conectamos esto con tu tabla de movimientos o stock_actual.
    if (stockInicial) {
      console.log("Stock inicial pendiente de registrar:", {
        producto_id: productoInsertado.id,
        ...stockInicial,
      });

      mostrarToast(
        "Producto guardado correctamente. El stock inicial quedó preparado para integrarlo en el siguiente paso."
      );
    } else {
      mostrarToast("Producto guardado correctamente");
    }

    await cargarProductos();
  };

  const eliminarProducto = async (producto) => {
    const confirmar = window.confirm(
      `¿Seguro que deseas eliminar "${producto.nombre}"?`
    );

    if (!confirmar) return;

    const { data, error } = await supabase
      .from("productos")
      .delete()
      .eq("id", producto.id)
      .select();

    if (error) {
      const esRestriccion =
        error.message?.toLowerCase().includes("violates foreign key constraint") ||
        error.details?.toLowerCase().includes("still referenced") ||
        error.code === "23503";

      if (esRestriccion) {
        mostrarToast(
          "No se puede eliminar este producto porque tiene movimientos asociados. Lo ideal es desactivarlo."
        );
      } else {
        console.error("Error real al eliminar producto:", error);
        mostrarToast("Hubo un error al eliminar el producto", "error");
      }

      return;
    }

    if (!data || data.length === 0) {
      mostrarToast("No se pudo eliminar el producto", "error");
      return;
    }

    mostrarToast("Producto eliminado correctamente");

    if (productoEditar?.id === producto.id) {
      setProductoEditar(null);
    }

    await cargarProductos();
  };

  const desactivarProducto = async (producto) => {
    const confirmar = window.confirm(
      `¿Seguro que deseas desactivar "${producto.nombre}"?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("productos")
      .update({ activo: false })
      .eq("id", producto.id);

    if (error) {
      console.error("Error al desactivar producto:", error);
      mostrarToast("No se pudo desactivar el producto", "error");
      return;
    }

    mostrarToast("Producto desactivado correctamente");

    if (productoEditar?.id === producto.id) {
      setProductoEditar(null);
    }

    await cargarProductos();
  };

  const activarProducto = async (producto) => {
    const { error } = await supabase
      .from("productos")
      .update({ activo: true })
      .eq("id", producto.id);

    if (error) {
      console.error("Error al activar producto:", error);
      mostrarToast("No se pudo activar el producto", "error");
      return;
    }

    mostrarToast("Producto activado correctamente");
    await cargarProductos();
  };

  const exportarProductos = () => {
    const dataExport = productos.map((producto) => ({
      ID: producto.id,
      Código: producto.codigo || "",
      Nombre: producto.nombre || "",
      Categoría: producto.categoria || "",
      Unidad: producto.unidad || "",
      "Stock mínimo": producto.stock_minimo || 0,
      "Precio referencia": producto.precio_referencia ?? "Sin precio",
      Estado: producto.activo ? "Activo" : "Inactivo",
    }));

    exportToExcel(dataExport, "productos_bodega", "Productos");
  };

  const productosFiltrados = productos.filter((producto) => {
    const texto = busqueda.toLowerCase();

    return (
      producto.nombre?.toLowerCase().includes(texto) ||
      producto.codigo?.toLowerCase().includes(texto) ||
      producto.categoria?.toLowerCase().includes(texto)
    );
  });

  useEffect(() => {
    cargarProductos();
  }, [mostrarInactivos]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />

      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Productos</h1>
            <p className="mt-1 text-sm text-gray-500">
              Crea la ficha base de cada producto. El stock inicial puede cargarse
              opcionalmente al crearlo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={mostrarInactivos}
                onChange={(e) => setMostrarInactivos(e.target.checked)}
              />
              Mostrar inactivos
            </label>

            <button
              onClick={exportarProductos}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Exportar Excel
            </button>
          </div>
        </div>

        <input
          type="text"
          placeholder="Buscar por nombre, código o categoría"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 md:w-96"
        />
      </div>

      <ProductoForm
        onGuardar={guardarProducto}
        productoEditar={productoEditar}
        onCancelarEdicion={() => setProductoEditar(null)}
      />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">
          Listado de productos
        </h2>

        {loading ? (
          <p className="text-gray-600">Cargando productos...</p>
        ) : productosFiltrados.length === 0 ? (
          <p className="text-gray-600">No hay productos registrados.</p>
        ) : (
          <div className="grid gap-4">
            {productosFiltrados.map((producto) => (
              <div
                key={producto.id}
                className={`rounded-xl border p-4 ${
                  producto.activo
                    ? "border-gray-200"
                    : "border-yellow-300 bg-yellow-50"
                }`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {producto.nombre}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Código: {producto.codigo || "Sin código"} | Categoría:{" "}
                      {producto.categoria || "Sin categoría"}
                    </p>
                    <p className="text-sm text-gray-600">
                      Unidad: {producto.unidad || "No definida"} | Stock mínimo:{" "}
                      {producto.stock_minimo}
                    </p>
                    <p className="text-sm font-medium text-gray-700">
                      Precio referencia:{" "}
                      {producto.precio_referencia != null
                        ? `$${Number(producto.precio_referencia).toLocaleString(
                            "es-CL"
                          )}`
                        : "Sin precio"}
                    </p>
                    <p
                      className={`mt-1 text-sm font-medium ${
                        producto.activo ? "text-green-600" : "text-yellow-700"
                      }`}
                    >
                      Estado: {producto.activo ? "Activo" : "Inactivo"}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex">
                    <button
                      onClick={() => setProductoEditar(producto)}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      Editar
                    </button>

                    {producto.activo ? (
                      <button
                        onClick={() => desactivarProducto(producto)}
                        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
                      >
                        Desactivar
                      </button>
                    ) : (
                      <button
                        onClick={() => activarProducto(producto)}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Activar
                      </button>
                    )}

                    <button
                      onClick={() => eliminarProducto(producto)}
                      className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Productos;