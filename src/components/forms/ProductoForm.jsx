import { useEffect, useState } from "react";
import { useToast } from "../../context/ToastContext";

function ProductoForm({ onGuardar, productoEditar, onCancelarEdicion }) {
  const { showToast } = useToast();

  const getInitialProductoData = () => ({
    codigo: "",
    nombre: "",
    categoria: "",
    unidad: "",
    stock_minimo: "",
    precio_referencia: "",
  });

  const getInitialStockData = () => ({
    cantidad: "",
    precio_unitario: "",
    observacion: "",
  });

  const [productoData, setProductoData] = useState(getInitialProductoData());
  const [stockData, setStockData] = useState(getInitialStockData());
  const [paso, setPaso] = useState(1); // 1: producto, 2: stock inicial
  const [quiereStockInicial, setQuiereStockInicial] = useState(null); // null = sin decidir, true/false
  const [loading, setLoading] = useState(false);

  // Cargar datos al editar
  useEffect(() => {
    if (productoEditar) {
      setProductoData({
        codigo: productoEditar.codigo || "",
        nombre: productoEditar.nombre || "",
        categoria: productoEditar.categoria || "",
        unidad: productoEditar.unidad || "",
        stock_minimo: productoEditar.stock_minimo ?? "",
        precio_referencia: productoEditar.precio_referencia ?? "",
      });
    } else {
      setProductoData(getInitialProductoData());
    }
  }, [productoEditar]);

  const handleProductoChange = (e) => {
    const { name, value } = e.target;
    setProductoData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStockChange = (e) => {
    const { name, value } = e.target;
    setStockData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setProductoData(getInitialProductoData());
    setStockData(getInitialStockData());
    setPaso(1);
    setQuiereStockInicial(null);
  };

  const validarPaso1 = () => {
    if (!productoData.nombre.trim()) {
      showToast("El nombre del producto es obligatorio", "error");
      return false;
    }
    return true;
  };

  const validarPaso2 = () => {
    if (!stockData.cantidad || Number(stockData.cantidad) < 0) {
      showToast("Debes ingresar una cantidad inicial válida", "error");
      return false;
    }
    if (stockData.precio_unitario !== "" && Number(stockData.precio_unitario) < 0) {
      showToast("El precio inicial no puede ser negativo", "error");
      return false;
    }
    return true;
  };

  const handleSiguiente = (e) => {
    e.preventDefault();
    if (validarPaso1()) {
      setPaso(2);
    }
  };

  const handleAtras = () => {
    setPaso(1);
  };

  const handleElegirStock = (quiere) => {
    setQuiereStockInicial(quiere);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (quiereStockInicial && !validarPaso2()) {
      return;
    }

    setLoading(true);

    const payload = {
      producto: {
        codigo: productoData.codigo.trim() || null,
        nombre: productoData.nombre.trim(),
        categoria: productoData.categoria.trim() || null,
        unidad: productoData.unidad.trim() || null,
        stock_minimo:
          productoData.stock_minimo !== ""
            ? Number(productoData.stock_minimo)
            : 0,
        precio_referencia:
          productoData.precio_referencia !== ""
            ? Number(productoData.precio_referencia)
            : null,
      },
      stockInicial:
        quiereStockInicial && Number(stockData.cantidad) > 0
          ? {
              cantidad: Number(stockData.cantidad),
              precio_unitario:
                stockData.precio_unitario !== ""
                  ? Number(stockData.precio_unitario)
                  : null,
              observacion: stockData.observacion.trim() || null,
            }
          : null,
    };

    await onGuardar(payload);

    if (!productoEditar) {
      resetForm();
    }

    setLoading(false);
  };

  // ─── MODO EDICIÓN: un solo paso, sin wizard ──────────────────────
  if (productoEditar) {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!validarPaso1()) return;
          setLoading(true);
          await onGuardar({
            producto: {
              codigo: productoData.codigo.trim() || null,
              nombre: productoData.nombre.trim(),
              categoria: productoData.categoria.trim() || null,
              unidad: productoData.unidad.trim() || null,
              stock_minimo:
                productoData.stock_minimo !== ""
                  ? Number(productoData.stock_minimo)
                  : 0,
              precio_referencia:
                productoData.precio_referencia !== ""
                  ? Number(productoData.precio_referencia)
                  : null,
            },
            stockInicial: null,
          });
          setLoading(false);
        }}
        className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-2 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Editar producto
          </h2>
          <button
            type="button"
            onClick={onCancelarEdicion}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar edición
          </button>
        </div>
        <p className="mb-6 text-sm text-gray-500">
          Modifica los datos base del producto. El stock se ajusta desde
          movimientos.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Código
            </label>
            <input
              type="text"
              name="codigo"
              value={productoData.codigo}
              onChange={handleProductoChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
              placeholder="Ej: TOR-001"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nombre *
            </label>
            <input
              type="text"
              name="nombre"
              value={productoData.nombre}
              onChange={handleProductoChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
              placeholder="Ej: Tornillo 1/2 zincado"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Categoría
            </label>
            <input
              type="text"
              name="categoria"
              value={productoData.categoria}
              onChange={handleProductoChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
              placeholder="Ej: Pernos"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Unidad
            </label>
            <input
              type="text"
              name="unidad"
              value={productoData.unidad}
              onChange={handleProductoChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
              placeholder="Ej: unidad, caja, litro"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Stock mínimo
            </label>
            <input
              type="number"
              name="stock_minimo"
              min="0"
              value={productoData.stock_minimo}
              onChange={handleProductoChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
              placeholder="Ej: 10"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Precio referencia (opcional)
            </label>
            <input
              type="number"
              name="precio_referencia"
              min="0"
              value={productoData.precio_referencia}
              onChange={handleProductoChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
              placeholder="Ej: 2500 o dejar vacío"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 rounded-lg bg-gray-800 px-4 py-2 font-medium text-white transition hover:bg-gray-900 disabled:opacity-50"
        >
          {loading ? "Actualizando..." : "Actualizar producto"}
        </button>
      </form>
    );
  }

  // ─── MODO CREACIÓN: wizard de 2 pasos ────────────────────────────
  return (
    <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Indicador de progreso */}
      <div className="mb-6 flex items-center gap-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
            paso === 1
              ? "bg-indigo-600 text-white"
              : "bg-indigo-100 text-indigo-700"
          }`}
        >
          1
        </div>
        <div
          className={`h-0.5 flex-1 ${
            paso === 2 ? "bg-indigo-300" : "bg-gray-200"
          }`}
        />
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
            paso === 2
              ? "bg-indigo-600 text-white"
              : "bg-gray-200 text-gray-500"
          }`}
        >
          2
        </div>
        <div className="ml-2 text-sm font-medium text-gray-600">
          {paso === 1 ? "Datos del producto" : "Stock inicial"}
        </div>
      </div>

      {/* PASO 1: datos del producto */}
      {paso === 1 && (
        <form onSubmit={handleSiguiente}>
          <p className="mb-6 text-sm text-gray-500">
            Define la ficha base del producto. El stock lo cargás en el
            siguiente paso.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Código
              </label>
              <input
                type="text"
                name="codigo"
                value={productoData.codigo}
                onChange={handleProductoChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                placeholder="Ej: TOR-001"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nombre *
              </label>
              <input
                type="text"
                name="nombre"
                value={productoData.nombre}
                onChange={handleProductoChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                placeholder="Ej: Tornillo 1/2 zincado"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Categoría
              </label>
              <input
                type="text"
                name="categoria"
                value={productoData.categoria}
                onChange={handleProductoChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                placeholder="Ej: Pernos"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Unidad
              </label>
              <input
                type="text"
                name="unidad"
                value={productoData.unidad}
                onChange={handleProductoChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                placeholder="Ej: unidad, caja, litro"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Stock mínimo
              </label>
              <input
                type="number"
                name="stock_minimo"
                min="0"
                value={productoData.stock_minimo}
                onChange={handleProductoChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                placeholder="Ej: 10"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Precio referencia (opcional)
              </label>
              <input
                type="number"
                name="precio_referencia"
                min="0"
                value={productoData.precio_referencia}
                onChange={handleProductoChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                placeholder="Ej: 2500 o dejar vacío"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Siguiente →
            </button>
          </div>
        </form>
      )}

      {/* PASO 2: stock inicial (opcional) */}
      {paso === 2 && (
        <form onSubmit={handleSubmit}>
          <p className="mb-6 text-sm text-gray-500">
            ¿Este producto ya existe físicamente en la bodega? Si querés, podés
            dejar registrado el stock inicial ahora.
          </p>

          {quiereStockInicial === null && (
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => handleElegirStock(true)}
                className="rounded-xl border-2 border-gray-200 bg-white p-6 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50"
              >
                <div className="mb-1 text-2xl">📦</div>
                <div className="font-semibold text-gray-800">
                  Sí, cargar stock inicial
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  El producto ya existe y quiero contar cuánto hay
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleElegirStock(false)}
                className="rounded-xl border-2 border-gray-200 bg-white p-6 text-left transition-colors hover:border-gray-400 hover:bg-gray-50"
              >
                <div className="mb-1 text-2xl">➕</div>
                <div className="font-semibold text-gray-800">
                  No, lo creo sin stock
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Lo doy de alta ahora, el stock se cargará después con
                  ingresos
                </div>
              </button>
            </div>
          )}

          {quiereStockInicial === true && (
            <div className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Cantidad inicial *
                  </label>
                  <input
                    type="number"
                    name="cantidad"
                    min="0"
                    value={stockData.cantidad}
                    onChange={handleStockChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="Ej: 25"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Precio estimado (opcional)
                  </label>
                  <input
                    type="number"
                    name="precio_unitario"
                    min="0"
                    value={stockData.precio_unitario}
                    onChange={handleStockChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="Ej: 2500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Observación
                  </label>
                  <textarea
                    name="observacion"
                    value={stockData.observacion}
                    onChange={handleStockChange}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="Ej: Stock contado manualmente al inicio del sistema"
                  />
                </div>
              </div>
            </div>
          )}

          {quiereStockInicial === false && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              El producto se creará con stock 0. Podés registrar ingresos
              después desde el menú <strong>Entradas</strong>.
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={handleAtras}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ← Atrás
            </button>

            {quiereStockInicial !== null && (
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading
                  ? "Guardando..."
                  : quiereStockInicial
                  ? "Crear con stock inicial"
                  : "Crear producto"}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

export default ProductoForm;
