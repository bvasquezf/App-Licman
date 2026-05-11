import { useEffect, useState } from "react";

function ProductoForm({ onGuardar, productoEditar, onCancelarEdicion }) {
  const getInitialFormData = () => ({
    codigo: "",
    nombre: "",
    categoria: "",
    unidad: "",
    stock_minimo: "",
    precio_referencia: "",
    cargar_stock_inicial: false,
    cantidad_inicial: "",
    precio_inicial: "",
    observacion_inicial: "",
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productoEditar) {
      setFormData({
        codigo: productoEditar.codigo || "",
        nombre: productoEditar.nombre || "",
        categoria: productoEditar.categoria || "",
        unidad: productoEditar.unidad || "",
        stock_minimo: productoEditar.stock_minimo ?? "",
        precio_referencia: productoEditar.precio_referencia ?? "",
        cargar_stock_inicial: false,
        cantidad_inicial: "",
        precio_inicial: "",
        observacion_inicial: "",
      });
    } else {
      setFormData(getInitialFormData());
    }
  }, [productoEditar]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData(getInitialFormData());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      alert("El nombre del producto es obligatorio");
      return;
    }

    if (!productoEditar && formData.cargar_stock_inicial) {
      if (
        formData.cantidad_inicial === "" ||
        Number(formData.cantidad_inicial) < 0
      ) {
        alert("Debes ingresar una cantidad inicial válida");
        return;
      }

      if (
        formData.precio_inicial !== "" &&
        Number(formData.precio_inicial) < 0
      ) {
        alert("El precio inicial no puede ser negativo");
        return;
      }
    }

    setLoading(true);

    const payload = {
      producto: {
        codigo: formData.codigo.trim() || null,
        nombre: formData.nombre.trim(),
        categoria: formData.categoria.trim() || null,
        unidad: formData.unidad.trim() || null,
        stock_minimo:
          formData.stock_minimo !== "" ? Number(formData.stock_minimo) : 0,
        precio_referencia:
          formData.precio_referencia !== ""
            ? Number(formData.precio_referencia)
            : null,
      },
      stockInicial:
        !productoEditar && formData.cargar_stock_inicial
          ? {
              cantidad: Number(formData.cantidad_inicial),
              precio_unitario:
                formData.precio_inicial !== ""
                  ? Number(formData.precio_inicial)
                  : null,
              observacion: formData.observacion_inicial.trim() || null,
            }
          : null,
    };

    await onGuardar(payload);

    if (!productoEditar) {
      resetForm();
    }

    setLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-2 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-800">
          {productoEditar ? "Editar producto" : "Crear ficha de producto"}
        </h2>

        {productoEditar && (
          <button
            type="button"
            onClick={onCancelarEdicion}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar edición
          </button>
        )}
      </div>

      <p className="mb-6 text-sm text-gray-500">
        {productoEditar
          ? "Modifica los datos base del producto. El stock debe ajustarse desde movimientos."
          : "Aquí defines el producto base. También puedes cargar stock inicial si el producto ya existe físicamente en bodega."}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Código
          </label>
          <input
            type="text"
            name="codigo"
            value={formData.codigo}
            onChange={handleChange}
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
            value={formData.nombre}
            onChange={handleChange}
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
            value={formData.categoria}
            onChange={handleChange}
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
            value={formData.unidad}
            onChange={handleChange}
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
            value={formData.stock_minimo}
            onChange={handleChange}
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
            value={formData.precio_referencia}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
            placeholder="Ej: 2500 o dejar vacío"
          />
        </div>

        {!productoEditar && (
          <>
            <div className="md:col-span-2 mt-2 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  name="cargar_stock_inicial"
                  checked={formData.cargar_stock_inicial}
                  onChange={handleChange}
                />
                Cargar stock inicial ahora
              </label>

              <p className="mt-2 text-sm text-gray-500">
                Activa esta opción si el producto ya existe físicamente en la
                bodega y quieres dejarlo contado desde el inicio, aunque no tenga
                factura.
              </p>
            </div>

            {formData.cargar_stock_inicial && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Cantidad inicial *
                  </label>
                  <input
                    type="number"
                    name="cantidad_inicial"
                    min="0"
                    value={formData.cantidad_inicial}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="Ej: 25"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Precio estimado inicial (opcional)
                  </label>
                  <input
                    type="number"
                    name="precio_inicial"
                    min="0"
                    value={formData.precio_inicial}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="Ej: 2500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Observación inicial
                  </label>
                  <textarea
                    name="observacion_inicial"
                    value={formData.observacion_inicial}
                    onChange={handleChange}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="Ej: Stock contado manualmente al inicio del sistema"
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 rounded-lg bg-gray-800 px-4 py-2 font-medium text-white transition hover:bg-gray-900 disabled:opacity-50"
      >
        {loading
          ? productoEditar
            ? "Actualizando..."
            : "Guardando..."
          : productoEditar
          ? "Actualizar producto"
          : "Guardar producto"}
      </button>
    </form>
  );
}

export default ProductoForm;