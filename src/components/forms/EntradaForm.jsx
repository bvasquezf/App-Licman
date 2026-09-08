import { useSearchParams } from "react-router-dom";
import ResumenCantidad from "./ResumenCantidad";
import { esUnidadEntera, validarCantidad } from "../../lib/bodegaUtils";
import { useState } from "react";
import { useToast } from "../../context/ToastContext";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import Card from "../ui/Card";

const inputClass =
    "min-h-[44px] w-full rounded-[10px] border border-slate-200/60 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-[3px] focus:ring-blue-600/15 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100 dark:placeholder-neutral-500 sm:text-base";

function Field({ label, required, children, className = "" }) {
    return (
        <label className={`block ${className}`}>
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                {label} {required && <span className="text-rose-500">*</span>}
            </span>
            {children}
        </label>
    );
}

function EntradaForm({ productos, onGuardar }) {
    const { showToast } = useToast();
    const [params] = useSearchParams();
    const initialFormData = {
        producto_id: params.get("producto") || "",
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

    useUnsavedChanges(formData);

    const productoSeleccionado = productos.find((p) => String(p.id) === formData.producto_id);
    const esCompra = formData.motivo_movimiento === "compra";
    const requiereObservacion =
        formData.motivo_movimiento === "ajuste_positivo";

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

        const errorCantidad = validarCantidad(formData.cantidad, productoSeleccionado?.unidad);
        if (errorCantidad) { showToast(errorCantidad, "error"); return; }
        if (loading) return;
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

        try {
            const ok = await onGuardar(nuevaEntrada);
            if (ok) resetForm();
        } catch {
            showToast("No se pudo registrar. Tus datos siguen en el formulario", "error");
        } finally { setLoading(false); }
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
            <div className="flex items-center gap-3 border-b border-slate-200/60 bg-emerald-50 px-4 py-3 dark:border-white/10 dark:bg-emerald-500/10 sm:px-5 sm:py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-emerald-100 text-lg dark:bg-emerald-500/15">
                    ⬇️
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                        Registrar ingreso de stock
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                        Compras, stock inicial o ajustes
                        positivos
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-5">
                <fieldset disabled={loading} className="grid gap-4 md:grid-cols-2">
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
                        </select>
                    </Field>

                    <Field label={`Cantidad (${productoSeleccionado?.unidad || "unidad del producto"})`} required>
                        <input
                            type="number"
                            name="cantidad"
                            required
                            step={esUnidadEntera(productoSeleccionado?.unidad) ? "1" : "0.001"}
                            inputMode="decimal"
                            min="0"
                            value={formData.cantidad}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="Ej: 10"
                        />
                    </Field>

                    <Field label={`Precio por ${productoSeleccionado?.unidad || "unidad"} (CLP)`} required={esCompra}>
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
                </fieldset>

                <div className="mt-4"><ResumenCantidad producto={productoSeleccionado} cantidad={formData.cantidad} stock={productoSeleccionado?.stock} entrada /></div>
                <div className="mt-6 flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-emerald-700 hover:shadow-md active:scale-95 disabled:opacity-50"
                    >
                        {loading ? "Guardando..." : "Guardar ingreso"}
                    </button>
                </div>
            </form>
        </Card>
    );
}

export default EntradaForm;
