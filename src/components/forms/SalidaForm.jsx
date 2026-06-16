import { useState } from "react";
import { useToast } from "../../context/ToastContext";
import Card from "../ui/Card";

const inputClass =
    "w-full rounded-xl border border-slate-200/60 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20 sm:text-base";

function Field({ label, required, children, className = "" }) {
    return (
        <div className={className}>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            {children}
        </div>
    );
}

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
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const resetForm = () =>
        setFormData({
            producto_id: "",
            cantidad: "",
            solicitante: "",
            destino: "",
            observacion: "",
        });

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
        if (ok) resetForm();
        setLoading(false);
    };

    return (
        <Card padding="p-0" className="overflow-hidden">
            <div className="border-b border-slate-200/60 bg-gradient-to-br from-rose-50/40 to-slate-50 px-4 py-3 dark:border-slate-800 dark:from-rose-500/10 dark:to-slate-800/40 sm:px-5 sm:py-4">
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                    Registrar salida de stock
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Consumos internos, entregas a terreno o cualquier egreso
                </p>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-5">
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Producto" required>
                        <select
                            name="producto_id"
                            value={formData.producto_id}
                            onChange={handleChange}
                            className={inputClass}
                        >
                            <option value="">Seleccionar producto</option>
                            {productos.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.nombre}{" "}
                                    {p.codigo ? `(${p.codigo})` : ""}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Cantidad" required>
                        <input
                            type="number"
                            name="cantidad"
                            min="0"
                            value={formData.cantidad}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="Ej: 5"
                        />
                    </Field>

                    <Field label="Solicitante">
                        <input
                            type="text"
                            name="solicitante"
                            value={formData.solicitante}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="Ej: Juan Pérez"
                        />
                    </Field>

                    <Field label="Destino">
                        <input
                            type="text"
                            name="destino"
                            value={formData.destino}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="Ej: Obra Centro / Taller"
                        />
                    </Field>

                    <Field
                        label="Observación"
                        className="md:col-span-2"
                    >
                        <textarea
                            name="observacion"
                            value={formData.observacion}
                            onChange={handleChange}
                            rows={3}
                            className={inputClass}
                            placeholder="Detalle del consumo o entrega"
                        />
                    </Field>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-rose-700 hover:shadow-md active:scale-95 disabled:opacity-50"
                    >
                        {loading ? "Guardando..." : "Registrar salida"}
                    </button>
                </div>
            </form>
        </Card>
    );
}

export default SalidaForm;
