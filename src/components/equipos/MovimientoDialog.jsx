import { useEffect, useMemo, useRef, useState } from "react";
import {
    BODEGAS,
    CATEGORIAS_SWAP,
    MOTIVOS_MOVIMIENTO,
    camposPorMotivo,
    esSwap,
} from "../../lib/equiposConstants";
import { supabase } from "../../services/supabase";
import { useNetwork } from "../../context/NetworkContext";
import EquipoFoto from "./EquipoFoto";
import PhotoUpload from "./PhotoUpload";

const clasesInput =
    "mt-1 block w-full rounded-[10px] border-[1.5px] border-slate-300 bg-white px-3 py-2.5 text-base font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15";

const estadoInicial = {
    motivo: "",
    bodega_destino: "",
    ubicacion_destino: "",
    cliente_id: "",
    categoria: "",
    equipo_recibe_id: "",
    bodega_recibe_destino: "",
    destino_externo: "",
    responsable: "",
    notas: "",
};

/**
 * Diálogo controlado para registrar un movimiento de equipo.
 *
 * Props:
 *  - open: boolean
 *  - equipo: { id, marca, modelo, numero_interno, bodega, cliente_id,
 *              cliente_nombre?, ubicacion_actual, foto_url, correlativo }
 *  - clientes: [{ id, razon_social }] — catálogo para el dropdown
 *  - onSubmit(payload): async — para movimientos simples (offline-capable).
 *      payload: { equipo_id, bodega_origen, bodega_destino, cliente_origen_id,
 *                 cliente_destino_id, ubicacion_origen, ubicacion_destino,
 *                 motivo, responsable, notas, categoria, destino_externo,
 *                 fotoFile?, oldFotoUrl? }
 *  - onSubmitSwap(payload): async — para cambios de equipo bidireccionales.
 *      payload: { equipo_id, bodega_origen, bodega_destino,
 *                 cliente_origen_id, cliente_destino_id, motivo, responsable,
 *                 notas, categoria,
 *                 equipo_recibe_id, bodega_recibe_destino,
 *                 fotoFile?, oldFotoUrl? }
 *  - onCrearCliente(): void — abre el modal hermano para crear un
 *      cliente nuevo (botón "+ Nuevo" junto al dropdown de cliente).
 *      El padre es responsable de manejar el modal CrearClienteForm.
 *  - onCancel(): void
 *
 * El form es dinámico: los campos mostrados dependen del motivo elegido.
 * El padre (ListView) decide si enrutar a onSubmit u onSubmitSwap.
 *
 * El equipo_origen es implícito: viene del prop `equipo`. El usuario
 * no elige qué equipo se mueve (es el que disparó el dialog).
 *
 * El dialog NO toca Storage directamente. Si el usuario adjunta una
 * foto nueva, se pasa en `payload.fotoFile` y el padre la sube con
 * `replaceFotoEquipo`.
 */
export default function MovimientoDialog({
    open,
    equipo,
    clientes = [],
    onSubmit,
    onSubmitSwap,
    onCrearCliente,
    onCancel,
}) {
    const refs = useRef({});
    const { online } = useNetwork();
    const [form, setForm] = useState(estadoInicial);
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(false);
    const [fotoFile, setFotoFile] = useState(null);
    const [fotoError, setFotoError] = useState(null);
    const [equiposDelCliente, setEquiposDelCliente] = useState([]);
    const [cargandoEquiposCliente, setCargandoEquiposCliente] = useState(false);

    // Reset al abrir
    useEffect(() => {
        if (open) {
            setForm({ ...estadoInicial, responsable: "" });
            setErrores({});
            setGuardando(false);
            setFotoFile(null);
            setFotoError(null);
            setEquiposDelCliente([]);
        }
    }, [open, equipo]);

    // Escape cierra
    useEffect(() => {
        if (!open) return undefined;
        const handler = (e) => {
            if (e.key === "Escape" && !guardando) onCancel();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, guardando, onCancel]);

    // Carga lazy de equipos del cliente cuando es swap y se selecciona cliente
    useEffect(() => {
        if (!open) return;
        if (!esSwap(form.motivo)) {
            setEquiposDelCliente([]);
            return;
        }
        if (!form.cliente_id) {
            setEquiposDelCliente([]);
            return;
        }
        let cancelado = false;
        const cargar = async () => {
            setCargandoEquiposCliente(true);
            try {
                const { data } = await supabase
                    .from("equipos")
                    .select(
                        "id, correlativo, marca, modelo, numero_interno, bodega",
                    )
                    .eq("cliente_id", form.cliente_id)
                    .is("deleted_at", null)
                    .order("correlativo");
                if (cancelado) return;
                setEquiposDelCliente(data ?? []);
            } catch {
                if (!cancelado) setEquiposDelCliente([]);
            } finally {
                if (!cancelado) setCargandoEquiposCliente(false);
            }
        };
        cargar();
        return () => {
            cancelado = true;
        };
    }, [open, form.motivo, form.cliente_id]);

    if (!open || !equipo) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        // Si cambia motivo o cliente_id, limpiar campos derivados
        if (name === "motivo") {
            setForm((prev) => ({
                ...prev,
                bodega_destino: "",
                cliente_id: "",
                categoria: "",
                equipo_recibe_id: "",
                bodega_recibe_destino: "",
                destino_externo: "",
            }));
            setEquiposDelCliente([]);
        } else if (name === "cliente_id") {
            setForm((prev) => ({ ...prev, equipo_recibe_id: "" }));
        }
        if (errores[name]) {
            setErrores((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const validar = () => {
        const errs = {};
        if (!form.motivo) errs.motivo = "Selecciona un motivo";
        if (!MOTIVOS_MOVIMIENTO.includes(form.motivo))
            errs.motivo = "Motivo no válido";
        if (!form.responsable.trim()) errs.responsable = "Indica quién registra";

        const { requiere } = camposPorMotivo(form.motivo);

        if (requiere.includes("bodega_destino") && !form.bodega_destino)
            errs.bodega_destino = "Selecciona una bodega";
        if (requiere.includes("cliente_id") && !form.cliente_id)
            errs.cliente_id = "Selecciona un cliente";
        if (requiere.includes("categoria") && !form.categoria)
            errs.categoria = "Selecciona la categoría";
        if (requiere.includes("equipo_recibe_id") && !form.equipo_recibe_id)
            errs.equipo_recibe_id = "Selecciona el equipo que recibes";
        if (
            requiere.includes("bodega_recibe_destino") &&
            !form.bodega_recibe_destino
        )
            errs.bodega_recibe_destino = "Selecciona la bodega destino";
        if (
            requiere.includes("destino_externo") &&
            !form.destino_externo.trim()
        )
            errs.destino_externo = "Indica el destino externo";
        if (requiere.includes("notas") && !form.notas.trim())
            errs.notas = "Cuéntanos el motivo";

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

        // Validación adicional: swap requiere conexión
        if (esSwap(form.motivo) && !online) {
            setErrores({
                motivo:
                    "Los cambios de equipo requieren conexión. Espera a tener red.",
            });
            return;
        }

        setGuardando(true);
        try {
            const base = {
                equipo_id: equipo.id,
                bodega_origen: equipo.bodega ?? null,
                bodega_destino: form.bodega_destino || null,
                cliente_origen_id: equipo.cliente_id ?? null,
                cliente_destino_id: form.cliente_id
                    ? Number(form.cliente_id)
                    : null,
                ubicacion_origen: equipo.ubicacion_actual ?? null,
                ubicacion_destino: form.ubicacion_destino.trim() || null,
                motivo: form.motivo,
                responsable: form.responsable.trim(),
                notas: form.notas.trim() || null,
                categoria: form.categoria || null,
                destino_externo: form.destino_externo.trim() || null,
                fotoFile: fotoFile || null,
                oldFotoUrl: fotoFile ? equipo.foto_url || null : null,
            };

            if (esSwap(form.motivo)) {
                await onSubmitSwap({
                    ...base,
                    equipo_recibe_id: Number(form.equipo_recibe_id),
                    bodega_recibe_destino: form.bodega_recibe_destino,
                });
            } else {
                await onSubmit(base);
            }
        } finally {
            setGuardando(false);
        }
    };

    const origenCliente = equipo.cliente_id && !equipo.bodega;
    const swapRequiereRed = esSwap(form.motivo) && !online;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="movimiento-titulo"
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget && !guardando) onCancel();
            }}
        >
            <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
                <header className="mb-4">
                    <h2
                        id="movimiento-titulo"
                        className="text-[1.15rem] font-bold text-slate-900"
                    >
                        🔄 Registrar movimiento
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                        {equipo.marca} {equipo.modelo} ·{" "}
                        <span className="font-mono font-semibold">
                            {equipo.numero_interno}
                        </span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        Origen actual:{" "}
                        {origenCliente ? (
                            <>
                                <span className="rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-800">
                                    🏢 En cliente
                                </span>
                            </>
                        ) : (
                            <strong className="text-slate-700">
                                {equipo.bodega}
                            </strong>
                        )}
                        {equipo.ubicacion_actual && (
                            <>
                                {" "}
                                ·{" "}
                                <span className="italic">
                                    {equipo.ubicacion_actual}
                                </span>
                            </>
                        )}
                    </p>
                </header>

                {/* Foto actual del equipo — solo referencia visual */}
                <section className="mb-4 flex items-start gap-3 rounded-[10px] border border-slate-200 bg-slate-50 p-3">
                    <EquipoFoto
                        path={equipo.foto_url || null}
                        size="sm"
                        alt="Foto actual del equipo"
                    />
                    <div className="min-w-0 flex-1">
                        <p className="text-[0.78rem] font-bold uppercase tracking-wider text-slate-500">
                            Foto actual
                        </p>
                        {equipo.foto_url ? (
                            <p className="mt-0.5 truncate text-xs text-slate-600">
                                {equipo.foto_url}
                            </p>
                        ) : (
                            <p className="mt-0.5 text-xs text-slate-500">
                                Este equipo aún no tiene foto.
                            </p>
                        )}
                    </div>
                </section>

                <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                    {/* Motivo (siempre visible) */}
                    <label className="block text-[0.85rem] font-semibold text-slate-900">
                        Motivo
                        <select
                            name="motivo"
                            value={form.motivo}
                            onChange={handleChange}
                            ref={(el) => (refs.current.motivo = el)}
                            className={clasesInput}
                        >
                            <option value="">— Selecciona —</option>
                            {MOTIVOS_MOVIMIENTO.map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </select>
                        {errores.motivo && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errores.motivo}
                            </p>
                        )}
                    </label>

                    {/* Campos dinámicos según motivo */}
                    <CamposPorMotivo
                        form={form}
                        errores={errores}
                        refs={refs}
                        clasesInput={clasesInput}
                        onChange={handleChange}
                        clientes={clientes}
                        equiposDelCliente={equiposDelCliente}
                        cargandoEquiposCliente={cargandoEquiposCliente}
                        onCrearCliente={onCrearCliente}
                    />

                    {/* Responsable (siempre) */}
                    <label className="block text-[0.85rem] font-semibold text-slate-900">
                        Responsable
                        <input
                            type="text"
                            name="responsable"
                            value={form.responsable}
                            onChange={handleChange}
                            ref={(el) => (refs.current.responsable = el)}
                            placeholder="Tu nombre completo"
                            className={clasesInput}
                        />
                        {errores.responsable && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errores.responsable}
                            </p>
                        )}
                    </label>

                    {/* Notas — opcional general, requerido si motivo es "Otro" */}
                    <label className="block text-[0.85rem] font-semibold text-slate-900">
                        Notas{" "}
                        {form.motivo === "Otro" ? (
                            <span className="font-normal text-rose-600">*</span>
                        ) : (
                            <span className="font-normal text-slate-500">
                                (opcional)
                            </span>
                        )}
                        <textarea
                            name="notas"
                            rows={2}
                            value={form.notas}
                            onChange={handleChange}
                            ref={(el) => (refs.current.notas = el)}
                            placeholder="Cliente, condiciones, detalles relevantes..."
                            className={`${clasesInput} resize-y`}
                        />
                        {errores.notas && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errores.notas}
                            </p>
                        )}
                    </label>

                    {/* Foto nueva (opcional) */}
                    <div className="rounded-[10px] border border-slate-200 bg-white p-3">
                        <PhotoUpload
                            value={fotoFile}
                            onChange={(f) => {
                                setFotoFile(f);
                                setFotoError(null);
                            }}
                            error={fotoError}
                            disabled={guardando}
                        />
                        <p className="mt-2 text-[0.7rem] text-slate-500">
                            Si subes una foto nueva, reemplazará la actual.
                            Si no subes nada, se mantiene la foto existente.
                        </p>
                    </div>

                    {swapRequiereRed && (
                        <div className="rounded-[10px] border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            Los cambios de equipo requieren conexión. Espera
                            a tener red para enviarlo.
                        </div>
                    )}

                    <div className="flex flex-col gap-2 pt-2 sm:flex-row-reverse">
                        <button
                            type="submit"
                            disabled={guardando}
                            className="flex-1 rounded-[10px] bg-blue-600 px-4 py-3 text-base font-bold text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {guardando ? "Guardando…" : "Registrar movimiento"}
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={guardando}
                            className="flex-1 rounded-[10px] bg-slate-100 px-4 py-3 text-base font-bold text-slate-900 transition hover:bg-slate-200 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/**
 * Sub-componente que renderiza los campos dinámicos según motivo.
 * Aísla la lógica del switch para no inflar MovimientoDialog.
 */
function CamposPorMotivo({
    form,
    errores,
    refs,
    clasesInput,
    onChange,
    clientes,
    equiposDelCliente,
    cargandoEquiposCliente,
    onCrearCliente,
}) {
    const { tipo } = useMemo(
        () => camposPorMotivo(form.motivo),
        [form.motivo],
    );

    if (tipo === "ninguno") return null;

    const opcionesBodegaSinOrigen = (origen) =>
        BODEGAS.filter((b) => b !== origen);

    // Dropdown reutilizable para seleccionar cliente, con botón "+ Nuevo"
    // que abre el modal hermano de creación (orquestado por el padre).
    const ClienteSelect = ({ name }) => (
        <div>
            <div className="flex items-end gap-2">
                <label className="flex-1 text-[0.85rem] font-semibold text-slate-900">
                    Cliente
                    <select
                        name={name}
                        value={form[name]}
                        onChange={onChange}
                        ref={(el) => (refs.current[name] = el)}
                        className={clasesInput}
                    >
                        <option value="">— Selecciona —</option>
                        {clientes.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.razon_social}
                            </option>
                        ))}
                    </select>
                </label>
                {onCrearCliente && (
                    <button
                        type="button"
                        onClick={onCrearCliente}
                        className="mb-1 inline-flex h-[44px] shrink-0 items-center gap-1.5 rounded-[10px] border-[1.5px] border-sky-300 bg-sky-50 px-3 text-[0.82rem] font-bold text-sky-800 transition hover:bg-sky-100 active:scale-95"
                        title="Crear un cliente nuevo en el catálogo"
                    >
                        + Nuevo
                    </button>
                )}
            </div>
            {errores[name] && (
                <p className="mt-1 text-xs font-medium text-rose-600">
                    {errores[name]}
                </p>
            )}
        </div>
    );

    return (
        <>
            {/* Bodega destino (cambio de bodega / devolución) */}
            {tipo === "bodega" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block text-[0.85rem] font-semibold text-slate-900">
                        Bodega destino
                        <select
                            name="bodega_destino"
                            value={form.bodega_destino}
                            onChange={onChange}
                            ref={(el) =>
                                (refs.current.bodega_destino = el)
                            }
                            className={clasesInput}
                        >
                            <option value="">— Selecciona —</option>
                            {opcionesBodegaSinOrigen(
                                form.motivo === "Devuelto de arriendo"
                                    ? null
                                    : null,
                            ).map((b) => (
                                <option key={b} value={b}>
                                    {b}
                                </option>
                            ))}
                        </select>
                        {errores.bodega_destino && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errores.bodega_destino}
                            </p>
                        )}
                    </label>
                    <label className="block text-[0.85rem] font-semibold text-slate-900">
                        Ubicación destino
                        <input
                            type="text"
                            name="ubicacion_destino"
                            value={form.ubicacion_destino}
                            onChange={onChange}
                            ref={(el) =>
                                (refs.current.ubicacion_destino = el)
                            }
                            placeholder="Ej. Patio norte, Galpón 2"
                            className={clasesInput}
                        />
                    </label>
                </div>
            )}

            {/* Cliente destino (arriendo / venta) */}
            {tipo === "cliente" && (
                <>
                    <ClienteSelect name="cliente_id" />
                    <label className="block text-[0.85rem] font-semibold text-slate-900">
                        Ubicación{" "}
                        <span className="font-normal text-slate-500">
                            (opcional)
                        </span>
                        <input
                            type="text"
                            name="ubicacion_destino"
                            value={form.ubicacion_destino}
                            onChange={onChange}
                            ref={(el) =>
                                (refs.current.ubicacion_destino = el)
                            }
                            placeholder="Ej. Patio norte, Galpón 2"
                            className={clasesInput}
                        />
                    </label>
                </>
            )}

            {/* Swap (cambio de equipo bidireccional) */}
            {tipo === "swap" && (
                <>
                    <ClienteSelect name="cliente_id" />

                    <label className="block text-[0.85rem] font-semibold text-slate-900">
                        Categoría
                        <select
                            name="categoria"
                            value={form.categoria}
                            onChange={onChange}
                            ref={(el) => (refs.current.categoria = el)}
                            className={clasesInput}
                        >
                            <option value="">— Selecciona —</option>
                            {CATEGORIAS_SWAP.map((c) => (
                                <option key={c.value} value={c.value}>
                                    {c.label}
                                </option>
                            ))}
                        </select>
                        {errores.categoria && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errores.categoria}
                            </p>
                        )}
                    </label>

                    <label className="block text-[0.85rem] font-semibold text-slate-900">
                        Equipo que recibe del cliente
                        <select
                            name="equipo_recibe_id"
                            value={form.equipo_recibe_id}
                            onChange={onChange}
                            ref={(el) =>
                                (refs.current.equipo_recibe_id = el)
                            }
                            className={clasesInput}
                            disabled={
                                !form.cliente_id || cargandoEquiposCliente
                            }
                        >
                            <option value="">
                                {cargandoEquiposCliente
                                    ? "Cargando…"
                                    : "— Selecciona —"}
                            </option>
                            {equiposDelCliente.map((e) => (
                                <option key={e.id} value={e.id}>
                                    #
                                    {String(e.correlativo).padStart(4, "0")} ·
                                    {" "}
                                    {e.marca} {e.modelo}
                                    {e.numero_interno
                                        ? ` · ${e.numero_interno}`
                                        : ""}
                                </option>
                            ))}
                        </select>
                        {errores.equipo_recibe_id && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errores.equipo_recibe_id}
                            </p>
                        )}
                        {form.cliente_id &&
                            !cargandoEquiposCliente &&
                            equiposDelCliente.length === 0 && (
                                <p className="mt-1 text-xs text-slate-500">
                                    Este cliente no tiene equipos para
                                    recibir. Verifica que esté en arriendo o
                                    venta.
                                </p>
                            )}
                    </label>

                    <label className="block text-[0.85rem] font-semibold text-slate-900">
                        Bodega destino del equipo recibido
                        <select
                            name="bodega_recibe_destino"
                            value={form.bodega_recibe_destino}
                            onChange={onChange}
                            ref={(el) =>
                                (refs.current.bodega_recibe_destino = el)
                            }
                            className={clasesInput}
                        >
                            <option value="">— Selecciona —</option>
                            {BODEGAS.map((b) => (
                                <option key={b} value={b}>
                                    {b}
                                </option>
                            ))}
                        </select>
                        {errores.bodega_recibe_destino && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errores.bodega_recibe_destino}
                            </p>
                        )}
                    </label>

                    <label className="block text-[0.85rem] font-semibold text-slate-900">
                        Ubicación{" "}
                        <span className="font-normal text-slate-500">
                            (opcional)
                        </span>
                        <input
                            type="text"
                            name="ubicacion_destino"
                            value={form.ubicacion_destino}
                            onChange={onChange}
                            ref={(el) =>
                                (refs.current.ubicacion_destino = el)
                            }
                            placeholder="Ej. Patio norte, Galpón 2"
                            className={clasesInput}
                        />
                    </label>

                    <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-[0.78rem] text-amber-900">
                        <strong>Cambio de equipo:</strong> se registrará el
                        envío de este equipo al cliente y, simultáneamente,
                        la recepción del equipo seleccionado. Ambas piernas
                        quedan vinculadas en el historial.
                    </div>
                </>
            )}

            {/* Mantención externa */}
            {tipo === "externo" && (
                <>
                    <label className="block text-[0.85rem] font-semibold text-slate-900">
                        Proveedor / destino externo{" "}
                        <span className="font-normal text-rose-600">*</span>
                        <input
                            type="text"
                            name="destino_externo"
                            value={form.destino_externo}
                            onChange={onChange}
                            ref={(el) =>
                                (refs.current.destino_externo = el)
                            }
                            placeholder="Ej. Servicio Técnico XYZ"
                            className={clasesInput}
                        />
                        {errores.destino_externo && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errores.destino_externo}
                            </p>
                        )}
                    </label>
                    <label className="block text-[0.85rem] font-semibold text-slate-900">
                        Ubicación{" "}
                        <span className="font-normal text-slate-500">
                            (opcional)
                        </span>
                        <input
                            type="text"
                            name="ubicacion_destino"
                            value={form.ubicacion_destino}
                            onChange={onChange}
                            ref={(el) =>
                                (refs.current.ubicacion_destino = el)
                            }
                            placeholder="Detalle adicional"
                            className={clasesInput}
                        />
                    </label>
                </>
            )}

            {/* Libre (motivo = "Otro") — solo notas se pide abajo */}
            {tipo === "libre" && (
                <label className="block text-[0.85rem] font-semibold text-slate-900">
                    Ubicación{" "}
                    <span className="font-normal text-slate-500">
                        (opcional)
                    </span>
                    <input
                        type="text"
                        name="ubicacion_destino"
                        value={form.ubicacion_destino}
                        onChange={onChange}
                        ref={(el) => (refs.current.ubicacion_destino = el)}
                        placeholder="Detalle de ubicación"
                        className={clasesInput}
                    />
                </label>
            )}
        </>
    );
}