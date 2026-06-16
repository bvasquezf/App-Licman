import { useMemo, useState } from "react";
import { useToast } from "../../context/ToastContext";

function EntradaForm({ productos, onGuardar }) {
    const { showToast } = useToast();
  const initialFormData = {
    producto_id: "",
    motivo_movimiento: "compra",
    cantidad: "",
    precio_unitario: "",
    proveedor: "",
    tipo_documento: "",
    numero_documento: "",
    observacion: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);

  const esCompra = formData.motivo_movimiento === "compra";
  const requiereObservacion =
    formData.motivo_movimiento === "ajuste_positivo" ||
    formData.motivo_movimiento === "stock_inicial" ||
    formData.motivo_movimiento === "devolucion";

  const productoSeleccionado = useMemo(() => {
    return (
      productos.find((p) => String(p.id) === String(formData.producto_id)) || null
    );
  }, [productos, formData.producto_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: value,
      };

      if (name === "motivo_movimiento") {
        if (value !== "compra") {
          next.proveedor = "";
          next.tipo_documento = "";
          next.numero_documento = "";
        }

        if (value !== "compra" && value !== "stock_inicial") {
          // dejamos precio opcional para otros casos
        }
      }

      return next;
    });
  };

  const resetForm = () => {
    setFormData(initialFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.producto_id) {
      showToast("Debes seleccionar un producto", "error");
      return;
    }

    if (!formData.cantidad || Number(formData.cantidad) <= 0) {
      showToast("Debes ingresar una cantidad válida", "error");
      return;
    }

    if (formData.precio_unitario !== "" && Number(formData.precio_unitario) < 0) {
      showToast("El precio unitario no puede ser negativo", "error");
      return;
    }

    if (esCompra) {
      if (formData.precio_unitario === "" || Number(formData.precio_unitario) < 0) {
        showToast("En una compra debes ingresar el precio unitario", "error");
        return;
      }

      if (!formData.proveedor.trim()) {
        showToast("En una compra debes ingresar el proveedor", "error");
        return;
      }

      if (!formData.numero_documento.trim()) {
        showToast("En una compra debes ingresar el número de documento", "error");
        return;
      }
    }

    if (requiereObservacion && !formData.observacion.trim()) {
      showToast("Debes ingresar una observación para este tipo de movimiento", "error");
      return;
    }

    setLoading(true);

    const nuevaEntrada = {
      producto_id: Number(formData.producto_id),
      tipo_movimiento: "entrada",
      motivo_movimiento: formData.motivo_movimiento,
      cantidad: Number(formData.cantidad),
      precio_unitario:
        formData.precio_unitario !== "" ? Number(formData.precio_unitario) : null,
      proveedor: formData.proveedor.trim() || null,
      tipo_documento: formData.tipo_documento.trim() || null,
      numero_documento: formData.numero_documento.trim() || null,
      observacion: formData.observacion.trim() || null,
    };

    const ok = await onGuardar(nuevaEntrada);

    if (ok) {
      resetForm();
    }

    setLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-2">
        <h2 className="text-xl font-semibold text-gray-800">
          Registrar ingreso de stock
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Registra compras, stock inicial, devoluciones o ajustes positivos sin
          obligarte a usar siempre factura.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Producto *
          </label>
          <select
            name="producto_id"
            value={formData.producto_id}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 p-2"
          >
            <option value="">Seleccionar producto</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} {p.codigo ? `(${p.codigo})` : ""}
              </option>
            ))}
          </select>

          {productoSeleccionado && (
            <p className="mt-2 text-xs text-gray-500">
              Unidad: {productoSeleccionado.unidad || "No definida"} | Stock mínimo:{" "}
              {productoSeleccionado.stock_minimo ?? 0}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Tipo de ingreso *
          </label>
          <select
            name="motivo_movimiento"
            value={formData.motivo_movimiento}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 p-2"
          >
            <option value="compra">Compra</option>
            <option value="stock_inicial">Stock inicial</option>
            <option value="ajuste_positivo">Ajuste positivo</option>
            <option value="devolucion">Devolución</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Cantidad *
          </label>
          <input
            type="number"
            name="cantidad"
            min="0"
            value={formData.cantidad}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 p-2"
            placeholder="Ej: 10"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Precio unitario
            {esCompra ? " *" : " (opcional)"}
          </label>
          <input
            type="number"
            name="precio_unitario"
            min="0"
            value={formData.precio_unitario}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 p-2"
            placeholder={
              esCompra
                ? "Según factura"
                : "Opcional para valorización o estimación"
            }
          />
        </div>

        {esCompra && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Proveedor *
              </label>
              <input
                type="text"
                name="proveedor"
                value={formData.proveedor}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 p-2"
                placeholder="Ej: Sodimac / proveedor interno"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tipo de documento
              </label>
              <select
                name="tipo_documento"
                value={formData.tipo_documento}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 p-2"
              >
                <option value="">Seleccionar</option>
                <option value="factura">Factura</option>
                <option value="boleta">Boleta</option>
                <option value="guia">Guía de despacho</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                N° Documento *
              </label>
              <input
                type="text"
                name="numero_documento"
                value={formData.numero_documento}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 p-2"
                placeholder="Ej: 12345"
              />
            </div>
          </>
        )}

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Observación {requiereObservacion ? "*" : "(opcional)"}
          </label>
          <textarea
            name="observacion"
            value={formData.observacion}
            onChange={handleChange}
            rows={3}
            className="w-full rounded-lg border border-gray-300 p-2"
            placeholder={
              formData.motivo_movimiento === "stock_inicial"
                ? "Ej: Stock contado manualmente al inicio del sistema"
                : formData.motivo_movimiento === "ajuste_positivo"
                ? "Ej: Diferencia detectada en conteo físico"
                : formData.motivo_movimiento === "devolucion"
                ? "Ej: Material devuelto a bodega desde terreno"
                : "Observación opcional"
            }
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Guardar ingreso"}
      </button>
    </form>
  );
}

export default EntradaForm;