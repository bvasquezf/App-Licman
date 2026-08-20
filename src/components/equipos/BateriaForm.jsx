import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useModalTransition } from "../../hooks/useModalTransition";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { useResponsableSesion } from "../../hooks/useResponsableSesion";

const clasesInput =
    "mt-1 block w-full rounded-[10px] border-[1.5px] border-slate-300 bg-white px-3 py-2.5 text-base font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100 dark:placeholder-neutral-500";

const estadoInicial = {
    numero_interno: "",
    numero_serie: "",
    voltaje: "",
    amperaje: "",
    bodega: "Antillanca",
    equipo_id: "",
    horometro: "",
    responsable: "",
    observaciones: "",
};

export default function BateriaForm({ open, equipos = [], onSubmit, onCancel }) {
    const transicion = useModalTransition(open);
    const responsableSesion = useResponsableSesion();
    const [form, setForm] = useState(() => ({
        ...estadoInicial,
        responsable: responsableSesion,
    }));
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(false);
    const [asociarEquipo, setAsociarEquipo] = useState(false);
    const [busquedaEquipo, setBusquedaEquipo] = useState("");
    const refs = useRef({});
    const dialogRef = useRef(null);
    const [versionFormulario, setVersionFormulario] = useState(0);

    useUnsavedChanges([form, asociarEquipo], {
        habilitado: open && !guardando,
        resetKey: versionFormulario,
    });

    useEffect(() => {
        if (!open) return;
        setForm({ ...estadoInicial, responsable: responsableSesion });
        setErrores({});
        setGuardando(false);
        setAsociarEquipo(false);
        setBusquedaEquipo("");
        setVersionFormulario((version) => version + 1);
    }, [open, responsableSesion]);

    useDialogA11y(open, {
        dialogRef,
        onClose: onCancel,
        bloquearCierre: guardando,
    });

    const equipoSeleccionado = equipos.find(
        (equipo) => String(equipo.id) === String(form.equipo_id),
    );

    const equiposFiltrados = useMemo(() => {
        const texto = busquedaEquipo
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
        if (!texto) return equipos;
        return equipos.filter((equipo) =>
            [
                equipo.numero_interno,
                equipo.numero_serie,
                equipo.tipo_equipo,
                equipo.marca,
                equipo.modelo,
            ]
                .filter(Boolean)
                .join(" ")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .includes(texto),
        );
    }, [busquedaEquipo, equipos]);

    if (!transicion.renderizar) return null;

    const cambiar = (event) => {
        const { name, value } = event.target;
        const limpio = ["voltaje", "amperaje", "horometro"].includes(name)
            ? value.replace(",", ".").replace(/[^\d.]/g, "")
            : value;
        setForm((prev) => ({ ...prev, [name]: limpio }));
        if (errores[name]) {
            setErrores((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const validar = () => {
        const next = {};
        const numeroValido = (valor) =>
            /^\d+(\.\d+)?$/.test(String(valor).trim()) && Number(valor) > 0;
        const horometroValido = (valor) =>
            /^\d+(\.\d+)?$/.test(String(valor).trim()) && Number(valor) >= 0;
        if (!form.numero_interno.trim()) {
            next.numero_interno = "El número interno es obligatorio";
        }
        if (!form.numero_serie.trim()) {
            next.numero_serie = "El número de serie es obligatorio";
        }
        if (!numeroValido(form.voltaje)) {
            next.voltaje = "Ingresa un voltaje mayor que cero";
        }
        if (!numeroValido(form.amperaje)) {
            next.amperaje = "Ingresa un amperaje mayor que cero";
        }
        if (!form.responsable.trim()) {
            next.responsable = "El responsable es obligatorio";
        }
        if (asociarEquipo) {
            if (!form.equipo_id) {
                next.equipo_id = "Selecciona el equipo al que quedará asociada";
            }
            if (!horometroValido(form.horometro)) {
                next.horometro = "Ingresa el horómetro actualizado del equipo";
            } else if (
                equipoSeleccionado?.horometro !== null &&
                equipoSeleccionado?.horometro !== undefined &&
                Number(form.horometro) < Number(equipoSeleccionado.horometro)
            ) {
                next.horometro = `Debe ser igual o mayor que ${equipoSeleccionado.horometro} h`;
            }
        }
        return next;
    };

    const enviar = async (event) => {
        event.preventDefault();
        const next = validar();
        if (Object.keys(next).length > 0) {
            setErrores(next);
            refs.current[Object.keys(next)[0]]?.focus();
            return;
        }

        setGuardando(true);
        try {
            const exito = await onSubmit?.({
                numero_interno: form.numero_interno.trim(),
                numero_serie: form.numero_serie.trim(),
                voltaje: form.voltaje,
                amperaje: form.amperaje,
                bodega: form.bodega,
                equipo_id: asociarEquipo ? Number(form.equipo_id) : null,
                horometro: asociarEquipo ? form.horometro : null,
                responsable: form.responsable.trim(),
                observaciones: form.observaciones.trim() || null,
            });
            if (exito === false) return;
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div
            className={`fixed inset-0 z-40 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4 ${transicion.claseFondo}`}
            onClick={() => !guardando && onCancel?.()}
            role="presentation"
        >
            <form
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="bateria-form-title"
                aria-busy={guardando}
                tabIndex={-1}
                onSubmit={enviar}
                onClick={(event) => event.stopPropagation()}
                className={`flex max-h-[calc(100dvh-1rem)] w-full max-w-xl flex-col overflow-hidden rounded-t-[18px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.25)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-[18px] dark:border-white/10 dark:bg-carbon-900 ${transicion.clasePanel}`}
            >
                <header
                    className="flex items-start justify-between border-b border-slate-200 px-5 pb-4 dark:border-white/10 sm:px-6"
                    style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
                >
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">
                            Inventario eléctrico
                        </p>
                        <h2
                            id="bateria-form-title"
                            className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100"
                        >
                            Registrar batería
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                            Solo baterías grandes, reparables y asociables a equipos eléctricos.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={guardando}
                        data-dialog-autofocus
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xl text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
                        aria-label="Cerrar"
                    >
                        ×
                    </button>
                </header>

                <div className="overflow-y-auto px-5 py-5 sm:px-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Campo
                            label="N° interno"
                            name="numero_interno"
                            value={form.numero_interno}
                            onChange={cambiar}
                            error={errores.numero_interno}
                            ref={(element) => {
                                refs.current.numero_interno = element;
                            }}
                            placeholder="Ej: BAT-001"
                        />
                        <Campo
                            label="N° de serie"
                            name="numero_serie"
                            value={form.numero_serie}
                            onChange={cambiar}
                            error={errores.numero_serie}
                            ref={(element) => {
                                refs.current.numero_serie = element;
                            }}
                            placeholder="Serie de fábrica"
                        />
                        <Campo
                            label="Voltaje"
                            name="voltaje"
                            type="number"
                            inputMode="decimal"
                            min="0.01"
                            step="any"
                            value={form.voltaje}
                            onChange={cambiar}
                            error={errores.voltaje}
                            ref={(element) => {
                                refs.current.voltaje = element;
                            }}
                            placeholder="Ej: 48"
                        />
                        <Campo
                            label="Amperaje (Ah)"
                            name="amperaje"
                            type="number"
                            inputMode="decimal"
                            min="0.01"
                            step="any"
                            value={form.amperaje}
                            onChange={cambiar}
                            error={errores.amperaje}
                            ref={(element) => {
                                refs.current.amperaje = element;
                            }}
                            placeholder="Ej: 625"
                        />
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                        <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
                            <input
                                type="checkbox"
                                checked={asociarEquipo}
                                onChange={(event) => {
                                    const activo = event.target.checked;
                                    setAsociarEquipo(activo);
                                    if (!activo) {
                                        setForm((prev) => ({
                                            ...prev,
                                            equipo_id: "",
                                            horometro: "",
                                        }));
                                        setBusquedaEquipo("");
                                    }
                                }}
                                className="h-5 w-5 accent-blue-600"
                            />
                            <span>
                                <strong className="block text-sm text-slate-900 dark:text-slate-100">
                                    Asociar esta batería a un equipo ahora
                                </strong>
                                <span className="block text-xs text-slate-500 dark:text-neutral-400">
                                    Se actualizará la ficha del equipo y ambos historiales.
                                </span>
                            </span>
                        </label>

                        {asociarEquipo && (
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <label className="block sm:col-span-2">
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        Buscar equipo eléctrico
                                    </span>
                                    <input
                                        type="search"
                                        value={busquedaEquipo}
                                        onChange={(event) => setBusquedaEquipo(event.target.value)}
                                        placeholder="N° interno, serie, marca o modelo"
                                        className={clasesInput}
                                    />
                                </label>
                                <label className="block sm:col-span-2">
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        Equipo
                                    </span>
                                    <select
                                        value={form.equipo_id}
                                        onChange={(event) => {
                                            const equipoId = event.target.value;
                                            const seleccionado = equipos.find(
                                                (equipo) => String(equipo.id) === equipoId,
                                            );
                                            setForm((prev) => ({
                                                ...prev,
                                                equipo_id: equipoId,
                                                horometro:
                                                    seleccionado?.horometro === null ||
                                                    seleccionado?.horometro === undefined
                                                        ? ""
                                                        : String(seleccionado.horometro),
                                            }));
                                            setErrores((prev) => ({
                                                ...prev,
                                                equipo_id: undefined,
                                                horometro: undefined,
                                            }));
                                        }}
                                        className={`${clasesInput} ${errores.equipo_id ? "border-red-500" : ""}`}
                                    >
                                        <option value="">Selecciona un equipo</option>
                                        {[
                                            ...(equipoSeleccionado &&
                                            !equiposFiltrados.some(
                                                (equipo) => equipo.id === equipoSeleccionado.id,
                                            )
                                                ? [equipoSeleccionado]
                                                : []),
                                            ...equiposFiltrados,
                                        ].map((equipo) => (
                                            <option key={equipo.id} value={equipo.id}>
                                                {equipo.numero_interno || "Sin N°"} · {equipo.tipo_equipo} · {equipo.marca || ""} {equipo.modelo || ""}
                                            </option>
                                        ))}
                                    </select>
                                    {errores.equipo_id && (
                                        <span className="mt-1 block text-xs font-semibold text-red-600 dark:text-red-400">
                                            {errores.equipo_id}
                                        </span>
                                    )}
                                    {equipos.length === 0 && (
                                        <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">
                                            No hay equipos eléctricos sin batería registrada disponibles.
                                        </span>
                                    )}
                                </label>
                                <Campo
                                    label="Horómetro actualizado"
                                    name="horometro"
                                    type="text"
                                    inputMode="decimal"
                                    value={form.horometro}
                                    onChange={cambiar}
                                    error={errores.horometro}
                                    ref={(element) => {
                                        refs.current.horometro = element;
                                    }}
                                    placeholder="Horas actuales"
                                />
                                {equipoSeleccionado && (
                                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-800 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-200">
                                        <span className="block text-xs font-semibold uppercase">Ubicación del equipo</span>
                                        <strong>{equipoSeleccionado.bodega || "En cliente"}</strong>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="block">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                {asociarEquipo ? "Bodega de respaldo" : "Bodega inicial"}
                            </span>
                            <select
                                name="bodega"
                                value={form.bodega}
                                onChange={cambiar}
                                className={clasesInput}
                                disabled={asociarEquipo}
                            >
                                <option value="Antillanca">Antillanca</option>
                                <option value="Cordillera">Cordillera</option>
                            </select>
                            {asociarEquipo && (
                                <span className="mt-1 block text-xs text-slate-500 dark:text-neutral-400">
                                    Mientras esté asociada, su ubicación será la del equipo.
                                </span>
                            )}
                        </label>
                        <Campo
                            label="Responsable del ingreso"
                            name="responsable"
                            value={form.responsable}
                            readOnly
                            aria-readonly="true"
                            error={errores.responsable}
                            ref={(element) => {
                                refs.current.responsable = element;
                            }}
                        />
                    </div>

                    <label className="mt-4 block">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            Observaciones <span className="font-normal text-slate-400">(opcional)</span>
                        </span>
                        <textarea
                            name="observaciones"
                            value={form.observaciones}
                            onChange={cambiar}
                            rows={3}
                            className={`${clasesInput} resize-y`}
                            placeholder="Estado, reparación pendiente u otro dato útil"
                        />
                    </label>

                    <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-3 text-sm text-sky-800 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-200">
                        {asociarEquipo ? (
                            <>
                                La batería quedará <strong>asociada inmediatamente</strong> al equipo seleccionado y el movimiento aparecerá en ambas fichas.
                            </>
                        ) : (
                            <>
                                La batería quedará <strong>Disponible</strong> en la bodega seleccionada. Podrás asociarla después desde la ficha del equipo.
                            </>
                        )}
                    </div>
                </div>

                <footer className="grid grid-cols-2 gap-2 border-t border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-white/10 dark:bg-carbon-900/95">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={guardando}
                        className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={guardando}
                        className="min-h-[44px] rounded-xl bg-blue-600 px-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {guardando ? "Guardando…" : "Registrar batería"}
                    </button>
                </footer>
            </form>
        </div>
    );
}

const Campo = forwardRef(({ label, error, ...props }, ref) => (
    <label className="block">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {label}
        </span>
        <input
            {...props}
            ref={ref}
            className={`${clasesInput} ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/15" : ""}`}
        />
        {error && <span className="mt-1 block text-xs font-semibold text-red-600 dark:text-red-400">{error}</span>}
    </label>
));
