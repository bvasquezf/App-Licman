import { useEffect, useRef, useState } from "react";
import {
    BODEGAS,
    ESTADO_UBICACION_POR_REGULARIZAR,
} from "../../lib/equiposConstants";
import { descripcionUltimaUbicacion } from "../../lib/equiposPresentacion";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import {
    useModalTransition,
    useRetainedValue,
} from "../../hooks/useModalTransition";
import { useResponsableSesion } from "../../hooks/useResponsableSesion";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { useNetwork } from "../../context/NetworkContext";

const clasesInput =
    "mt-1 block min-h-[44px] w-full rounded-[10px] border-[1.5px] border-slate-300 bg-white px-3 py-2.5 text-base font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100 dark:placeholder-neutral-500";

const ACCIONES = [
    {
        id: "bodega",
        icono: "📦",
        titulo: "Apareció en bodega",
        detalle: "Confirma en cuál bodega Licman está.",
    },
    {
        id: "cliente",
        icono: "🏢",
        titulo: "Sigue en cliente",
        detalle: "Confirma el cliente actual como arriendo.",
    },
    {
        id: "venta",
        icono: "💰",
        titulo: "Fue vendido",
        detalle: "Regulariza una venta histórica sin respaldo disponible.",
    },
];

const estadoInicial = {
    accion: "",
    bodega_destino: "",
    cliente_destino_id: "",
    ubicacion_destino: "",
    fecha_venta: "",
    notas: "",
};

export default function RegularizarUbicacionDialog({
    open,
    equipo: equipoProp,
    clientes = [],
    onSubmit,
    onCancel,
}) {
    const dialogRef = useRef(null);
    const refs = useRef({});
    const { online } = useNetwork();
    const responsable = useResponsableSesion();
    const transicion = useModalTransition(open);
    const equipo = useRetainedValue(
        equipoProp,
        open && Boolean(equipoProp),
    );
    const [form, setForm] = useState(estadoInicial);
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(false);
    const [versionFormulario, setVersionFormulario] = useState(0);

    const esPendiente =
        equipo?.estado_ubicacion === ESTADO_UBICACION_POR_REGULARIZAR;

    useUnsavedChanges(form, {
        habilitado: open && !guardando,
        resetKey: versionFormulario,
    });

    useEffect(() => {
        if (!open) return;
        setForm({
            ...estadoInicial,
            accion:
                equipoProp?.estado_ubicacion ===
                ESTADO_UBICACION_POR_REGULARIZAR
                    ? ""
                    : "marcar",
        });
        setErrores({});
        setGuardando(false);
        setVersionFormulario((version) => version + 1);
    }, [open, equipoProp]);

    useDialogA11y(open, {
        dialogRef,
        onClose: onCancel,
        bloquearCierre: guardando,
    });

    if (!transicion.renderizar || !equipo) return null;

    const actualizar = (campo, valor) => {
        setForm((anterior) => ({ ...anterior, [campo]: valor }));
        if (errores[campo]) {
            setErrores((anteriores) => {
                const siguientes = { ...anteriores };
                delete siguientes[campo];
                return siguientes;
            });
        }
    };

    const seleccionarAccion = (accion) => {
        setForm((anterior) => ({
            ...anterior,
            accion,
            bodega_destino: "",
            cliente_destino_id: "",
            ubicacion_destino: "",
            fecha_venta: "",
        }));
        setErrores({});
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const siguientes = {};
        if (esPendiente && !form.accion) {
            siguientes.accion = "Selecciona cómo se regularizó la ubicación";
        }
        if (form.accion === "bodega" && !form.bodega_destino) {
            siguientes.bodega_destino = "Selecciona la bodega confirmada";
        }
        if (
            ["cliente", "venta"].includes(form.accion) &&
            !form.cliente_destino_id
        ) {
            siguientes.cliente_destino_id = "Selecciona el cliente confirmado";
        }
        if (!form.notas.trim()) {
            siguientes.notas = esPendiente
                ? "Explica cómo se confirmó esta regularización"
                : "Explica por qué la ubicación actual no es confiable";
        }
        if (!online) {
            siguientes.conexion =
                "Esta regularización requiere conexión para guardar la trazabilidad.";
        }

        if (Object.keys(siguientes).length > 0) {
            setErrores(siguientes);
            const primerCampo = Object.keys(siguientes)[0];
            refs.current[primerCampo]?.focus();
            return;
        }

        setGuardando(true);
        try {
            const guardado = await onSubmit({
                equipo_id: equipo.id,
                accion: form.accion,
                bodega_destino: form.bodega_destino || null,
                cliente_destino_id: form.cliente_destino_id
                    ? Number(form.cliente_destino_id)
                    : null,
                ubicacion_destino: form.ubicacion_destino.trim() || null,
                fecha_venta: form.fecha_venta || null,
                responsable,
                notas: form.notas.trim(),
            });
            if (guardado) onCancel();
        } finally {
            setGuardando(false);
        }
    };

    const clienteActual = clientes.find(
        (cliente) => String(cliente.id) === String(equipo.cliente_id),
    );
    const ubicacionRegistrada = esPendiente
        ? descripcionUltimaUbicacion(equipo)
        : clienteActual?.razon_social
          ? `Cliente: ${clienteActual.razon_social}`
          : equipo.cliente_id
            ? `Cliente #${equipo.cliente_id}`
            : equipo.bodega
              ? `Bodega ${equipo.bodega}`
              : equipo.ubicacion_actual || "Sin ubicación registrada";
    const clientesDisponibles =
        form.accion === "venta"
            ? clientes
            : clientes.filter((cliente) => cliente.activo !== false);

    return (
        <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="regularizar-ubicacion-titulo"
            aria-busy={guardando}
            tabIndex={-1}
            className={`fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4 ${transicion.claseFondo}`}
            onClick={(event) => {
                if (event.target === event.currentTarget && !guardando) onCancel();
            }}
        >
            <div
                className={`max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6 dark:bg-carbon-900 ${transicion.clasePanel}`}
            >
                <header className="sticky top-0 z-10 -mx-5 -mt-5 mb-4 flex items-start justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 dark:border-white/10 dark:bg-carbon-900/95">
                    <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
                            Control de ubicación
                        </p>
                        <h2
                            id="regularizar-ubicacion-titulo"
                            className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100"
                        >
                            {esPendiente
                                ? "Regularizar ubicación"
                                : "Marcar por regularizar"}
                        </h2>
                        <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                            {equipo.marca} {equipo.modelo} ·{" "}
                            <span className="font-mono font-semibold">
                                {equipo.numero_interno || "Sin N° interno"}
                            </span>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={guardando}
                        data-dialog-autofocus
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl text-slate-600 transition hover:bg-slate-200 disabled:opacity-50 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10"
                        aria-label="Cerrar regularización de ubicación"
                    >
                        ×
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100">
                        <p className="font-extrabold">
                            ⚠️ {esPendiente ? "Último registro conocido" : "Ubicación registrada actualmente"}
                        </p>
                        <p className="mt-1 font-semibold">{ubicacionRegistrada}</p>
                        <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                            {esPendiente
                                ? "La ubicación que confirmes reemplazará el estado pendiente, pero este antecedente seguirá en el historial."
                                : "Al guardar, el equipo saldrá de los conteos de cliente, venta y bodega. El dato anterior quedará respaldado para investigarlo."}
                        </p>
                    </section>

                    {esPendiente && (
                        <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                ¿Qué se confirmó?
                            </p>
                            <div
                                ref={(el) => {
                                    refs.current.accion = el;
                                }}
                                tabIndex={-1}
                                className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3"
                                role="radiogroup"
                                aria-label="Resultado de la regularización"
                            >
                                {ACCIONES.map((opcion) => {
                                    const activa = form.accion === opcion.id;
                                    return (
                                        <button
                                            key={opcion.id}
                                            type="button"
                                            role="radio"
                                            aria-checked={activa}
                                            onClick={() => seleccionarAccion(opcion.id)}
                                            className={`min-h-[86px] rounded-xl border-[1.5px] p-3 text-left transition active:scale-[0.98] ${
                                                activa
                                                    ? "border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-600/15 dark:bg-blue-500/15 dark:text-blue-200"
                                                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200 dark:hover:bg-white/10"
                                            }`}
                                        >
                                            <span className="text-xl" aria-hidden="true">
                                                {opcion.icono}
                                            </span>
                                            <span className="mt-1 block text-sm font-extrabold">
                                                {opcion.titulo}
                                            </span>
                                            <span className="mt-0.5 block text-xs font-medium opacity-80">
                                                {opcion.detalle}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            {errores.accion && (
                                <p className="mt-1 text-xs font-semibold text-rose-600">
                                    {errores.accion}
                                </p>
                            )}
                        </div>
                    )}

                    {form.accion === "bodega" && (
                        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Bodega confirmada
                            <select
                                value={form.bodega_destino}
                                onChange={(event) =>
                                    actualizar("bodega_destino", event.target.value)
                                }
                                ref={(el) => {
                                    refs.current.bodega_destino = el;
                                }}
                                className={clasesInput}
                            >
                                <option value="">Selecciona una bodega</option>
                                {BODEGAS.map((bodega) => (
                                    <option key={bodega} value={bodega}>
                                        {bodega}
                                    </option>
                                ))}
                            </select>
                            {errores.bodega_destino && (
                                <p className="mt-1 text-xs font-semibold text-rose-600">
                                    {errores.bodega_destino}
                                </p>
                            )}
                        </label>
                    )}

                    {["cliente", "venta"].includes(form.accion) && (
                        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Cliente confirmado
                            <select
                                value={form.cliente_destino_id}
                                onChange={(event) =>
                                    actualizar(
                                        "cliente_destino_id",
                                        event.target.value,
                                    )
                                }
                                ref={(el) => {
                                    refs.current.cliente_destino_id = el;
                                }}
                                className={clasesInput}
                            >
                                <option value="">Selecciona un cliente</option>
                                {clientesDisponibles.map((cliente) => (
                                    <option key={cliente.id} value={cliente.id}>
                                        {cliente.razon_social}
                                        {cliente.activo === false
                                            ? " (inactivo)"
                                            : ""}
                                    </option>
                                ))}
                            </select>
                            {errores.cliente_destino_id && (
                                <p className="mt-1 text-xs font-semibold text-rose-600">
                                    {errores.cliente_destino_id}
                                </p>
                            )}
                        </label>
                    )}

                    {["bodega", "cliente", "venta"].includes(form.accion) && (
                        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Ubicación específica{" "}
                            <span className="font-normal text-slate-500 dark:text-neutral-400">
                                (opcional)
                            </span>
                            <input
                                type="text"
                                value={form.ubicacion_destino}
                                onChange={(event) =>
                                    actualizar(
                                        "ubicacion_destino",
                                        event.target.value,
                                    )
                                }
                                placeholder="Ej. patio norte, taller o sucursal"
                                className={clasesInput}
                            />
                        </label>
                    )}

                    {form.accion === "venta" && (
                        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Fecha conocida de la venta{" "}
                            <span className="font-normal text-slate-500 dark:text-neutral-400">
                                (opcional)
                            </span>
                            <input
                                type="date"
                                value={form.fecha_venta}
                                max={new Date().toISOString().slice(0, 10)}
                                onChange={(event) =>
                                    actualizar("fecha_venta", event.target.value)
                                }
                                className={clasesInput}
                            />
                            <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-neutral-400">
                                Esta vía es solo para regularizar antecedentes antiguos sin acta ni guía disponibles.
                            </span>
                        </label>
                    )}

                    <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {esPendiente
                            ? "Cómo se confirmó"
                            : "Motivo de la revisión"}{" "}
                        <span className="text-rose-600">*</span>
                        <textarea
                            rows={4}
                            value={form.notas}
                            onChange={(event) =>
                                actualizar("notas", event.target.value)
                            }
                            ref={(el) => {
                                refs.current.notas = el;
                            }}
                            placeholder={
                                esPendiente
                                    ? "Ej. se encontró físicamente en el inventario de Renca..."
                                    : "Ej. no apareció en el inventario físico y el último registro es de 2022..."
                            }
                            className={`${clasesInput} resize-y`}
                        />
                        {errores.notas && (
                            <p className="mt-1 text-xs font-semibold text-rose-600">
                                {errores.notas}
                            </p>
                        )}
                    </label>

                    <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Responsable
                        <input
                            type="text"
                            value={responsable}
                            readOnly
                            aria-readonly="true"
                            className={clasesInput}
                        />
                    </label>

                    {!online && (
                        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300">
                            Esta regularización requiere conexión para guardar la trazabilidad.
                        </p>
                    )}

                    <div
                        className="sticky bottom-0 z-10 -mx-5 -mb-5 flex flex-col gap-2 border-t border-slate-200 bg-white/95 px-5 pt-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:flex-row-reverse sm:px-6 dark:border-white/10 dark:bg-carbon-900/95"
                        style={{
                            paddingBottom:
                                "max(1rem, env(safe-area-inset-bottom))",
                        }}
                    >
                        <button
                            type="submit"
                            disabled={guardando || !online}
                            className="min-h-[44px] flex-1 rounded-[10px] bg-amber-600 px-4 py-3 text-base font-bold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {guardando
                                ? "Guardando…"
                                : esPendiente
                                  ? "Confirmar regularización"
                                  : "Marcar por regularizar"}
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={guardando}
                            className="min-h-[44px] flex-1 rounded-[10px] bg-slate-100 px-4 py-3 text-base font-bold text-slate-900 transition hover:bg-slate-200 disabled:opacity-50 dark:bg-carbon-800 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
