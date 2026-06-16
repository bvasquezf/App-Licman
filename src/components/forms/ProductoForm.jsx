import { useEffect, useState } from "react";
import { useToast } from "../../context/ToastContext";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import Card from "../ui/Card";
import {
    detectarCategoria,
    generarCodigo,
} from "../../utils/productCodeUtils";
import { useSiguienteCorrelativo } from "../../hooks/useSiguienteCorrelativo";
import { useCodigoDisponible } from "../../hooks/useCodigoDisponible";

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

const inputClass =
    "w-full rounded-xl border border-slate-200/60 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20 sm:text-base";

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
    const [paso, setPaso] = useState(1);
    const [quiereStockInicial, setQuiereStockInicial] = useState(null);
    const [loading, setLoading] = useState(false);

    // Flags de auto-generación: cuando el usuario edita manualmente
    // categoría o código, dejamos de sobrescribir automáticamente.
    const [categoriaEsManual, setCategoriaEsManual] = useState(false);
    const [codigoEsManual, setCodigoEsManual] = useState(false);

    // Activamos el snapshot del "unsaved changes" solo después de que
    // el effect de arriba haya cargado el producto (modo edición) o
    // el form esté listo (modo creación). Si lo activamos desde el
    // primer render, capturaría el initial vacío y nos protegería
    // de un refresh accidental sin querer.
    const [snapshotListo, setSnapshotListo] = useState(false);

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
            setCategoriaEsManual(false);
            setCodigoEsManual(false);
        }
        setSnapshotListo(true);
    }, [productoEditar]);

    useUnsavedChanges(productoData, { habilitado: snapshotListo });

    // ─── Auto-detección de categoría ──────────────────────────────
    // Solo aplica en modo creación y cuando el usuario no la editó a mano.
    useEffect(() => {
        if (productoEditar || categoriaEsManual) return;
        const det = detectarCategoria(productoData.nombre);
        setProductoData((prev) => {
            if (prev.categoria === det.categoria) return prev;
            return { ...prev, categoria: det.categoria };
        });
    }, [productoData.nombre, categoriaEsManual, productoEditar]);

    // ─── Auto-generación de código ────────────────────────────────
    // Detecta prefijo desde el nombre, consulta correlativo a BD.
    const det = productoEditar ? null : detectarCategoria(productoData.nombre);
    const prefijo = det?.prefijo || "";

    const {
        siguiente,
        loading: loadingCodigo,
        refetch: refetchCorrelativo,
    } = useSiguienteCorrelativo(prefijo, {
        habilitado: !productoEditar && !!prefijo && !codigoEsManual,
    });

    // ─── Validación de unicidad del código ───────────────────────
    // En creación: solo si el usuario ya tocó el código o si tenemos
    // un código auto-sugerido. En edición: siempre, excluyendo el propio id.
    const codigoActual = (productoData.codigo || "").trim();
    const { disponible: codigoLibre, loading: loadingDisponible } =
        useCodigoDisponible(codigoActual, {
            habilitado: !!codigoActual,
            excluirId: productoEditar?.id ?? null,
        });

    useEffect(() => {
        if (productoEditar || codigoEsManual) return;
        if (!prefijo) {
            setProductoData((prev) =>
                prev.codigo === "" ? prev : { ...prev, codigo: "" }
            );
            return;
        }
        const nuevo = generarCodigo(prefijo, siguiente);
        setProductoData((prev) =>
            prev.codigo === nuevo ? prev : { ...prev, codigo: nuevo }
        );
    }, [prefijo, siguiente, codigoEsManual, productoEditar]);

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
        setCategoriaEsManual(false);
        setCodigoEsManual(false);
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
        if (
            stockData.precio_unitario !== "" &&
            Number(stockData.precio_unitario) < 0
        ) {
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

    // ─── MODO EDICIÓN ────────────────────────────────────────────
    if (productoEditar) {
        return (
            <Card className="overflow-hidden" padding="p-0">
                <div className="border-b border-slate-200/60 bg-amber-50/60 px-4 py-3 dark:border-slate-800 dark:bg-amber-500/10 sm:px-5 sm:py-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <div className="min-w-0">
                            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                                Editar producto
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Modifica los datos base. El stock se ajusta desde
                                movimientos.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onCancelarEdicion}
                            className="self-start whitespace-nowrap rounded-xl border border-slate-200/60 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 sm:self-auto"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>

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
                    className="p-4 sm:p-5"
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Código">
                            <div className="relative">
                                <input
                                    type="text"
                                    name="codigo"
                                    value={productoData.codigo}
                                    onChange={handleProductoChange}
                                    className={`${inputClass} pr-9 ${
                                        codigoLibre === false
                                            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500"
                                            : codigoLibre === true
                                            ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-emerald-500"
                                            : ""
                                    }`}
                                    placeholder="Ej: TOR-001"
                                />
                                {codigoActual && !loadingDisponible && (
                                    <span
                                        aria-hidden="true"
                                        className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 ${
                                            codigoLibre
                                                ? "text-emerald-500"
                                                : "text-rose-500"
                                        }`}
                                    >
                                        {codigoLibre ? "✓" : "✗"}
                                    </span>
                                )}
                            </div>
                            {codigoLibre === false && (
                                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                                    Este código ya está en uso por otro producto.
                                </p>
                            )}
                        </Field>
                        <Field label="Nombre" required>
                            <input
                                type="text"
                                name="nombre"
                                value={productoData.nombre}
                                onChange={handleProductoChange}
                                className={inputClass}
                                placeholder="Ej: Tornillo 1/2 zincado"
                                autoFocus
                            />
                        </Field>
                        <Field label="Categoría">
                            <input
                                type="text"
                                name="categoria"
                                value={productoData.categoria}
                                onChange={handleProductoChange}
                                className={inputClass}
                                placeholder="Ej: Pernos"
                            />
                        </Field>
                        <Field label="Unidad">
                            <input
                                type="text"
                                name="unidad"
                                value={productoData.unidad}
                                onChange={handleProductoChange}
                                className={inputClass}
                                placeholder="Ej: unidad, caja, litro"
                            />
                        </Field>
                        <Field label="Stock mínimo">
                            <input
                                type="number"
                                name="stock_minimo"
                                min="0"
                                value={productoData.stock_minimo}
                                onChange={handleProductoChange}
                                className={inputClass}
                                placeholder="Ej: 10"
                            />
                        </Field>
                        <Field label="Precio referencia (opcional)">
                            <input
                                type="number"
                                name="precio_referencia"
                                min="0"
                                value={productoData.precio_referencia}
                                onChange={handleProductoChange}
                                className={inputClass}
                                placeholder="Ej: 2500 o dejar vacío"
                            />
                        </Field>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:shadow-md active:scale-95 disabled:opacity-50"
                        >
                            {loading ? "Actualizando..." : "Actualizar producto"}
                        </button>
                    </div>
                </form>
            </Card>
        );
    }

    // ─── MODO CREACIÓN: wizard ────────────────────────────────────
    return (
        <Card padding="p-0" className="overflow-hidden">
            {/* Header con stepper */}
            <div className="border-b border-slate-200/60 bg-gradient-to-br from-indigo-50/40 to-slate-50 px-4 py-3 dark:border-slate-800 dark:from-indigo-500/10 dark:to-slate-800/40 sm:px-5 sm:py-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
                                paso === 1
                                    ? "scale-110 bg-indigo-600 text-white shadow-sm"
                                    : "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                            }`}
                        >
                            1
                        </div>
                        <div
                            className={`h-0.5 w-8 transition-colors duration-300 ${
                                paso === 2 ? "bg-indigo-400" : "bg-slate-200 dark:bg-slate-700"
                            }`}
                        />
                        <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
                                paso === 2
                                    ? "scale-110 bg-indigo-600 text-white shadow-sm"
                                    : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                            }`}
                        >
                            2
                        </div>
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {paso === 1
                                ? "Datos del producto"
                                : "Stock inicial"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Paso {paso} de 2
                        </p>
                    </div>
                </div>
            </div>

            {/* PASO 1 */}
            {paso === 1 && (
                <form onSubmit={handleSiguiente} className="p-4 sm:p-5">
                    <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
                        Define la ficha base del producto. El stock lo cargas en
                        el siguiente paso.
                    </p>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Código">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        name="codigo"
                                        value={productoData.codigo}
                                        onChange={(e) => {
                                            setCodigoEsManual(true);
                                            handleProductoChange(e);
                                        }}
                                        className={`${inputClass} pr-9 ${
                                            codigoLibre === false
                                                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500"
                                                : codigoLibre === true
                                                ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-emerald-500"
                                                : ""
                                        }`}
                                        placeholder={
                                            loadingCodigo
                                                ? "Generando…"
                                                : "Ej: TOR-001"
                                        }
                                        autoComplete="off"
                                    />
                                    {codigoActual && !loadingDisponible && (
                                        <span
                                            aria-hidden="true"
                                            className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 ${
                                                codigoLibre
                                                    ? "text-emerald-500"
                                                    : "text-rose-500"
                                            }`}
                                        >
                                            {codigoLibre ? "✓" : "✗"}
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    disabled={!prefijo || loadingCodigo}
                                    onClick={() => {
                                        setCodigoEsManual(false);
                                        refetchCorrelativo();
                                    }}
                                    title="Regenerar código sugerido"
                                    aria-label="Regenerar código sugerido"
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/60 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <polyline points="23 4 23 10 17 10" />
                                        <polyline points="1 20 1 14 7 14" />
                                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                                    </svg>
                                </button>
                            </div>
                            {codigoLibre === false && (
                                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                                    Este código ya está en uso. Elegí otro o
                                    regenerá la sugerencia.
                                </p>
                            )}
                            {prefijo && !codigoEsManual && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Sugerido automáticamente · prefijo{" "}
                                    <span className="font-mono font-semibold">
                                        {prefijo}
                                    </span>
                                </p>
                            )}
                        </Field>
                        <Field label="Nombre" required>
                            <input
                                type="text"
                                name="nombre"
                                value={productoData.nombre}
                                onChange={handleProductoChange}
                                className={inputClass}
                                placeholder="Ej: Tornillo 1/2 zincado"
                                autoFocus
                            />
                        </Field>
                        <Field label="Categoría">
                            <div className="relative">
                                <input
                                    type="text"
                                    name="categoria"
                                    value={productoData.categoria}
                                    onChange={(e) => {
                                        setCategoriaEsManual(true);
                                        handleProductoChange(e);
                                    }}
                                    className={inputClass}
                                    placeholder="Ej: Pernos"
                                />
                                {productoData.categoria && !categoriaEsManual && (
                                    <span
                                        aria-hidden="true"
                                        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                                    >
                                        auto
                                    </span>
                                )}
                            </div>
                        </Field>
                        <Field label="Unidad">
                            <input
                                type="text"
                                name="unidad"
                                value={productoData.unidad}
                                onChange={handleProductoChange}
                                className={inputClass}
                                placeholder="Ej: unidad, caja, litro"
                            />
                        </Field>
                        <Field label="Stock mínimo">
                            <input
                                type="number"
                                name="stock_minimo"
                                min="0"
                                value={productoData.stock_minimo}
                                onChange={handleProductoChange}
                                className={inputClass}
                                placeholder="Ej: 10"
                            />
                        </Field>
                        <Field label="Precio referencia (opcional)">
                            <input
                                type="number"
                                name="precio_referencia"
                                min="0"
                                value={productoData.precio_referencia}
                                onChange={handleProductoChange}
                                className={inputClass}
                                placeholder="Ej: 2500 o dejar vacío"
                            />
                        </Field>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:shadow-md active:scale-95"
                        >
                            Siguiente
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                            </svg>
                        </button>
                    </div>
                </form>
            )}

            {/* PASO 2 */}
            {paso === 2 && (
                <form onSubmit={handleSubmit} className="p-4 sm:p-5">
                    <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
                        ¿Este producto ya existe físicamente en la bodega? Si
                        quieres, puedes dejar registrado el stock inicial ahora.
                    </p>

                    {quiereStockInicial === null && (
                        <div className="grid gap-3 md:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => handleElegirStock(true)}
                                className="group rounded-2xl border-2 border-slate-200/60 bg-white p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500 dark:hover:shadow-none"
                            >
                                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-xl transition-colors group-hover:bg-indigo-100 dark:bg-indigo-500/15">
                                    📦
                                </div>
                                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                    Sí, cargar stock inicial
                                </div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    El producto ya existe y quiero contar cuánto
                                    hay
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleElegirStock(false)}
                                className="group rounded-2xl border-2 border-slate-200/60 bg-white p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-500 dark:hover:shadow-none"
                            >
                                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl transition-colors group-hover:bg-slate-200 dark:bg-slate-800">
                                    ➕
                                </div>
                                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                    No, lo creo sin stock
                                </div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Lo doy de alta ahora, el stock se cargará
                                    después con ingresos
                                </div>
                            </button>
                        </div>
                    )}

                    {quiereStockInicial === true && (
                        <div className="space-y-4 rounded-2xl border border-indigo-200/60 bg-indigo-50/40 p-4 dark:border-indigo-500/30 dark:bg-indigo-500/10">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Cantidad inicial" required>
                                    <input
                                        type="number"
                                        name="cantidad"
                                        min="0"
                                        value={stockData.cantidad}
                                        onChange={handleStockChange}
                                        className={inputClass}
                                        placeholder="Ej: 25"
                                        autoFocus
                                    />
                                </Field>
                                <Field label="Precio estimado (opcional)">
                                    <input
                                        type="number"
                                        name="precio_unitario"
                                        min="0"
                                        value={stockData.precio_unitario}
                                        onChange={handleStockChange}
                                        className={inputClass}
                                        placeholder="Ej: 2500"
                                    />
                                </Field>
                                <Field
                                    label="Observación"
                                    className="md:col-span-2"
                                >
                                    <textarea
                                        name="observacion"
                                        value={stockData.observacion}
                                        onChange={handleStockChange}
                                        rows={2}
                                        className={inputClass}
                                        placeholder="Ej: Stock contado manualmente al inicio del sistema"
                                    />
                                </Field>
                            </div>
                        </div>
                    )}

                    {quiereStockInicial === false && (
                        <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
                            El producto se creará con stock 0. Podés registrar
                            ingresos después desde el menú{" "}
                            <strong>Entradas</strong>.
                        </div>
                    )}

                    <div className="mt-6 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:justify-between">
                        <button
                            type="button"
                            onClick={handleAtras}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/60 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <line x1="19" y1="12" x2="5" y2="12" />
                                <polyline points="12 19 5 12 12 5" />
                            </svg>
                            Atrás
                        </button>

                        {quiereStockInicial !== null && (
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:shadow-md active:scale-95 disabled:opacity-50"
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
        </Card>
    );
}

export default ProductoForm;
