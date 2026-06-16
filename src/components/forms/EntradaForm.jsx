import { useMemo, useState } from "react";
import { useToast } from "../../context/ToastContext";
import Card from "../ui/Card";

const inputClass =
    "w-full rounded-xl border border-slate-200/60 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20 sm:text-base";

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
        formData.motivo_movimiento === "ajuste_positivo";

    const productoSeleccionado = useMemo(() => {
        return (
            productos.find(
                (p) => String(p.id) === String(formData.producto_id)
            ) || null
        );
    }, [productos, formData.producto_id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            const next = { ...prev, [name]: value };
            if (name === "motivo_movimiento" && value !== "compra") {
                next.proveedor = "";
                next.tipo_documento = "";
                next.numero_documento = "";
            }
            return next;
        });
    };

    const resetForm = () => setFormData(initialFormData);

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
        if (
            formData.precio_unitario !== "" &&
            Number(formData.precio_unitario) < 0
        ) {
            showToast("El precio unitario no puede ser negativo", "error");
            return;
        }
        if (esCompra) {
            if (
                formData.precio_unitario === "" ||
                Number(formData.precio_unitario) < 0
            ) {
                showToast("En una compra debes ingresar el precio unitario", "error");
                return;
            }
            if (!formData.proveedor.trim()) {
                showToast("En una compra debes ingresar el proveedor", "error");
                return;
            }
            if (!formData.numero_documento.trim()) {
                showToast(
                    "En una compra debes ingresar el número de documento",
                    "error"
                );
                return;
            }
        }
        if (requiereObservacion && !formData.observacion.trim()) {
            showToast(
                "Debes ingresar una observación para este tipo de movimiento",
                "error"
            );
            return;
        }

        setLoading(true);

        const nuevaEntrada = {
            producto_id: Number(formData.producto_id),
            tipo_movimiento: "entrada",
            motivo_movimiento: formData.motivo_movimiento,
            cantidad: Number(formData.cantidad),
            precio_unitario:
                formData.precio_unitario !== ""
                    ? Number(formData.precio_unitario)
                    : null,
            proveedor: formData.proveedor.trim() || null,
            tipo_documento: formData.tipo_documento.trim() || null,
            numero_documento: formData.numero_documento.trim() || null,
            observacion: formData.observacion.trim() || null,
        };

        const ok = await onGuardar(nuevaEntrada);
        if (ok) resetForm();
        setLoading(false);
    };

    const getObservacionPlaceholder = () => {
        switch (formData.motivo_movimiento) {
            case "stock_inicial":
                return "Ej: Stock contado manualmente al inicio del sistema";
            case "ajuste_positivo":
                return "Ej: Diferencia detectada en conteo físico";
            case "devolucion":
                return "Ej: Material devuelto a bodega desde terreno";
            default:
                return "Observación opcional";
        }
    };

    return (
        <Card padding="p-0" className="overflow-hidden">
            {/* Header con color sólido (sin gradiente translúcido) */}
            <div className="flex items-center gap-3 border-b border-slate-200/60 bg-emerald-50 px-4 py-3 dark:border-slate-800 dark:bg-emerald-500/10 sm:px-5 sm:py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-lg dark:bg-emerald-500/20">
                    ⬇️
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                        Registrar ingreso de stock
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Compras, stock inicial, devoluciones o ajustes
                        positivos
                    </p>
                </div>
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

                    <Field label="Tipo de ingreso" required>
                        <select
                            name="motivo_movimiento"
                            value={formData.motivo_movimiento}
                            onChange={handleChange}
                            className={inputClass}
                        >
                            <option value="compra">Compra</option>
                            <option value="stock_inicial">
                                Stock inicial
                            </option>
                            <option value="ajuste_positivo">
                                Ajuste positivo
                            </option>
                            <option value="devolucion">Devolución</option>
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
                            placeholder="Ej: 10"
                        />
                    </Field>

                    <Field label="Precio unitario" required={esCompra}>
                        <input
                            type="number"
                            name="precio_unitario"
                            min="0"
                            value={formData.precio_unitario}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder={
                                esCompra
                                    ? "Según factura"
                                    : "Opcional para valorización"
                            }
                        />
                    </Field>

                    {esCompra && (
                        <>
                            <Field label="Proveedor" required>
                                <input
                                    type="text"
                                    name="proveedor"
                                    value={formData.proveedor}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="Ej: Sodimac / proveedor interno"
                                />
                            </Field>

                            <Field label="Tipo de documento">
                                <select
                                    name="tipo_documento"
                                    value={formData.tipo_documento}
                                    onChange={handleChange}
                                    className={inputClass}
                                >
                                    <option value="">Seleccionar</option>
                                    <option value="factura">Factura</option>
                                    <option value="boleta">Boleta</option>
                                    <option value="guia">
                                        Guía de despacho
                                    </option>
                                    <option value="otro">Otro</option>
                                </select>
                            </Field>

                            <Field
                                label="N° Documento"
                                required
                                className="md:col-span-2"
                            >
                                <input
                                    type="text"
                                    name="numero_documento"
                                    value={formData.numero_documento}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="Ej: 12345"
                                />
                            </Field>
                        </>
                    )}

                    <Field
                        label="Observación"
                        required={requiereObservacion}
                        className="md:col-span-2"
                    >
                        <textarea
                            name="observacion"
                            value={formData.observacion}
                            onChange={handleChange}
                            rows={3}
                            className={inputClass}
                            placeholder={getObservacionPlaceholder()}
                        />
                    </Field>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-emerald-700 hover:shadow-md active:scale-95 disabled:opacity-50"
                    >
                        {loading ? "Guardando..." : "Guardar ingreso"}
                    </button>
                </div>
            </form>
        </Card>
    );
}

export default EntradaForm;
