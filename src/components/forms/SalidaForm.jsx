import { useState } from "react";
import { useToast } from "../../context/ToastContext";

function SalidaForm({ productos, onGuardar }) {
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        producto_id: "",
        cantidad: "",
        solicitante: "",
        destino: "",
        observacion: "",
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const resetForm = () => {
        setFormData({
            producto_id: "",
            cantidad: "",
            solicitante: "",
            destino: "",
            observacion: "",
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.producto_id) {
            showToast("Selecciona un producto", "error");
            return;
        }

        if (!formData.cantidad || Number(formData.cantidad) <= 0) {
            showToast("Cantidad inválida", "error");
            return;
        }

        setLoading(true);

        const salida = {
            producto_id: Number(formData.producto_id),
            tipo_movimiento: "salida",
            cantidad: Number(formData.cantidad),
            solicitante: formData.solicitante.trim() || null,
            destino: formData.destino.trim() || null,
            observacion: formData.observacion.trim() || null,
        };

        const ok = await onGuardar(salida);

        if (ok) {
            resetForm();
        }

        setLoading(false);
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
            <h2 className="mb-1 text-xl font-semibold text-gray-800">
                Registrar salida de stock
            </h2>
            <p className="mb-6 text-sm text-gray-500">
                Registra consumos internos, entregas a terreno o cualquier
                egreso de bodega.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Producto *
                    </label>
                    <select
                        name="producto_id"
                        value={formData.producto_id}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:border-blue-500"
                    >
                        <option value="">Seleccionar producto</option>
                        {productos.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.nombre} {p.codigo ? `(${p.codigo})` : ""}
                            </option>
                        ))}
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
                        className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:border-blue-500"
                        placeholder="Ej: 5"
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Solicitante
                    </label>
                    <input
                        type="text"
                        name="solicitante"
                        value={formData.solicitante}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:border-blue-500"
                        placeholder="Ej: Juan Pérez"
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Destino
                    </label>
                    <input
                        type="text"
                        name="destino"
                        value={formData.destino}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:border-blue-500"
                        placeholder="Ej: Obra Centro / Taller"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Observación
                    </label>
                    <textarea
                        name="observacion"
                        value={formData.observacion}
                        onChange={handleChange}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:border-blue-500"
                        placeholder="Detalle del consumo o entrega"
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="mt-6 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
            >
                {loading ? "Guardando..." : "Registrar salida"}
            </button>
        </form>
    );
}

export default SalidaForm;
