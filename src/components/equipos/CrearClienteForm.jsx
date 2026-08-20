import { useEffect, useRef, useState } from "react";
import {
    useModalTransition,
    useRetainedValue,
} from "../../hooks/useModalTransition";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";

const clasesInput =
    "mt-1 block w-full rounded-[10px] border-[1.5px] border-slate-300 bg-white px-3 py-2.5 text-base font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100 dark:placeholder-neutral-500";

const estadoInicial = {
    razon_social: "",
    rut: "",
    contacto: "",
    mail: "",
    celular: "",
    direccion: "",
    comuna: "",
};

function formatearRut(value) {
    // Solo limpieza básica: sin puntos ni guión, mayúsculas. No validamos
    // dígito verificador acá — el operador lo escribe como viene.
    return String(value || "")
        .replace(/\./g, "")
        .replace(/-/g, "")
        .trim()
        .toUpperCase()
        .slice(0, 12);
}

/**
 * Modal controlado para crear / editar un cliente del catálogo.
 *
 * Props:
 *  - open: boolean
 *  - clienteInicial: opcional. Si viene, el form se abre en modo edición.
 *  - onSubmit(payload): async. El padre hace el upsert en Supabase.
 *  - onCancel(): void
 *
 * Validación: `razon_social` es obligatorio (NOT NULL en BD). El resto
 * es opcional. No validamos RUT: el catálogo del usuario trae RUTs en
 * formatos mixtos y el operador es quien decide.
 */
export default function CrearClienteForm({
    open,
    clienteInicial: clienteInicialProp = null,
    onSubmit,
    onCancel,
}) {
    const refs = useRef({});
    const dialogRef = useRef(null);
    const transicion = useModalTransition(open);
    const clienteInicial = useRetainedValue(clienteInicialProp, open);
    const [form, setForm] = useState(estadoInicial);
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(false);
    const [versionFormulario, setVersionFormulario] = useState(0);

    useUnsavedChanges(form, {
        habilitado: open && !guardando,
        resetKey: versionFormulario,
    });

    useEffect(() => {
        if (open) {
            setForm(clienteInicial ? { ...estadoInicial, ...clienteInicial } : estadoInicial);
            setErrores({});
            setGuardando(false);
            setVersionFormulario((version) => version + 1);
        }
    }, [open, clienteInicial]);

    useDialogA11y(open, {
        dialogRef,
        onClose: onCancel,
        bloquearCierre: guardando,
    });

    if (!transicion.renderizar) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        const limpio = name === "rut" ? formatearRut(value) : value;
        setForm((prev) => ({ ...prev, [name]: limpio }));
        if (errores[name]) {
            setSetErrores(name);
        }
    };

    const setSetErrores = (name) =>
        setErrores((prev) => {
            if (!prev[name]) return prev;
            const next = { ...prev };
            delete next[name];
            return next;
        });

    const validar = () => {
        const errs = {};
        if (!form.razon_social.trim())
            errs.razon_social = "La razón social es obligatoria";
        if (
            form.mail.trim() &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.mail.trim())
        ) {
            errs.mail = "Ingresa un correo válido";
        }
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validar();
        if (Object.keys(errs).length > 0) {
            setErrores(errs);
            const primerCampo = Object.keys(errs)[0];
            refs.current[primerCampo]?.focus();
            return;
        }
        setGuardando(true);
        try {
            await onSubmit({
                razon_social: form.razon_social.trim(),
                rut: form.rut.trim() || null,
                contacto: form.contacto.trim() || null,
                mail: form.mail.trim() || null,
                celular: form.celular.trim() || null,
                direccion: form.direccion.trim() || null,
                comuna: form.comuna.trim() || null,
            });
        } finally {
            setGuardando(false);
        }
    };

    const modoEdicion = Boolean(clienteInicial?.id);

    return (
        <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cliente-titulo"
            aria-busy={guardando}
            tabIndex={-1}
            className={`fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4 ${transicion.claseFondo}`}
            onClick={(e) => {
                if (e.target === e.currentTarget && !guardando) onCancel();
            }}
        >
            <div
                className={`max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6 dark:bg-carbon-900 ${transicion.clasePanel}`}
            >
                <header className="sticky top-0 z-10 -mx-5 -mt-5 mb-4 flex items-start justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 dark:border-white/10 dark:bg-carbon-900/95">
                    <div>
                        <h2
                            id="cliente-titulo"
                            className="text-[1.15rem] font-bold text-slate-900 dark:text-slate-100"
                        >
                            {modoEdicion ? "✏️ Editar cliente" : "👥 Nuevo cliente"}
                        </h2>
                        <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                            {modoEdicion
                                ? "Modifica los datos del cliente en el catálogo."
                                : "Agrega un cliente al catálogo. Luego podrás asignarlo a equipos en arriendo, venta o garantía."}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={guardando}
                        data-dialog-autofocus
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl text-slate-600 transition hover:bg-slate-200 disabled:opacity-50 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10"
                        aria-label="Cerrar formulario de cliente"
                    >
                        ×
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                    <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                        Razón social{" "}
                        <span className="font-normal text-rose-600">*</span>
                        <input
                            type="text"
                            name="razon_social"
                            value={form.razon_social}
                            onChange={handleChange}
                            ref={(el) => {
                                refs.current.razon_social = el;
                            }}
                            placeholder="Ej. TRANSPORTES LOGISTICOS SPA"
                            autoComplete="off"
                            className={clasesInput}
                        />
                        {errores.razon_social && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errores.razon_social}
                            </p>
                        )}
                    </label>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                            RUT
                            <input
                                type="text"
                                name="rut"
                                value={form.rut}
                                onChange={handleChange}
                                ref={(el) => {
                                    refs.current.rut = el;
                                }}
                                placeholder="76.302.113-0"
                                autoComplete="off"
                                inputMode="text"
                                className={clasesInput}
                            />
                        </label>

                        <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                            Contacto
                            <input
                                type="text"
                                name="contacto"
                                value={form.contacto}
                                onChange={handleChange}
                                ref={(el) => {
                                    refs.current.contacto = el;
                                }}
                                placeholder="Nombre de la persona"
                                autoComplete="off"
                                className={clasesInput}
                            />
                        </label>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                            Mail
                            <input
                                type="email"
                                name="mail"
                                value={form.mail}
                                onChange={handleChange}
                                ref={(el) => {
                                    refs.current.mail = el;
                                }}
                                placeholder="contacto@empresa.cl"
                                autoComplete="off"
                                inputMode="email"
                                aria-invalid={Boolean(errores.mail)}
                                className={`${clasesInput} ${errores.mail ? "border-rose-500" : ""}`}
                            />
                            {errores.mail && (
                                <p className="mt-1 text-xs font-medium text-rose-600">
                                    {errores.mail}
                                </p>
                            )}
                        </label>

                        <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                            Celular
                            <input
                                type="tel"
                                name="celular"
                                value={form.celular}
                                onChange={handleChange}
                                ref={(el) => {
                                    refs.current.celular = el;
                                }}
                                placeholder="+56 9 ..."
                                autoComplete="off"
                                inputMode="tel"
                                className={clasesInput}
                            />
                        </label>
                    </div>

                    <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                        Dirección
                        <input
                            type="text"
                            name="direccion"
                            value={form.direccion}
                            onChange={handleChange}
                            ref={(el) => {
                                refs.current.direccion = el;
                            }}
                            placeholder="Calle, número, oficina"
                            autoComplete="off"
                            className={clasesInput}
                        />
                    </label>

                    <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                        Comuna
                        <input
                            type="text"
                            name="comuna"
                            value={form.comuna}
                            onChange={handleChange}
                            ref={(el) => {
                                refs.current.comuna = el;
                            }}
                            placeholder="Comuna"
                            autoComplete="off"
                            className={clasesInput}
                        />
                    </label>

                    <div
                        className="sticky bottom-0 z-10 -mx-5 -mb-5 flex flex-col gap-2 border-t border-slate-200 bg-white/95 px-5 pt-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:flex-row-reverse sm:px-6 dark:border-white/10 dark:bg-carbon-900/95"
                        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
                    >
                        <button
                            type="submit"
                            disabled={guardando}
                            className="flex-1 rounded-[10px] bg-blue-600 px-4 py-3 text-base font-bold text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {guardando
                                ? "Guardando…"
                                : modoEdicion
                                  ? "Guardar cambios"
                                  : "Crear cliente"}
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={guardando}
                            className="flex-1 rounded-[10px] bg-slate-100 px-4 py-3 text-base font-bold text-slate-900 transition hover:bg-slate-200 disabled:opacity-50 dark:bg-carbon-800 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
