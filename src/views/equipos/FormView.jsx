import { useEffect, useMemo, useRef, useState } from "react";
import {
    BODEGAS,
    ELEMENTOS_FALTANTES,
    ESTADOS,
    MARCA_OTRA,
    MARCAS,
    PHOTO_EMAIL,
    TIPOS_EQUIPO,
} from "../../lib/equiposConstants";
import { equipoVacio, validarEquipo } from "../../lib/equiposValidacion";
import { useToast } from "../../context/ToastContext";
import { useNetwork } from "../../context/NetworkContext";
import { supabase } from "../../services/supabase";
import { uploadFotoEquipo } from "../../lib/equiposStorage";
import PhotoUpload from "../../components/equipos/PhotoUpload";
import EquiposHeader from "../../components/equipos/EquiposHeader";
import {
    cacheEquipos,
    enqueuePendingWrite,
    getCachedEquipos,
} from "../../lib/offlineDb";

const ESTADO_DESCRIPCIONES = {
    Operativo: "Equipo en condiciones de trabajar inmediatamente.",
    "Operativo con observaciones":
        "Funcional con defectos menores o pendientes.",
    Inoperativo: "No puede operar por fallas o falta de componentes.",
};

const clasesInput =
    "mt-1.5 block w-full rounded-[10px] border-[1.5px] border-slate-300 bg-white px-3 py-2.5 text-base font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15";

/**
 * Formulario de registro de equipos.
 * - Al montar pide `preview_next_correlativo` (pista visual).
 * - Al enviar: si online → RPC `insert_equipo` (asigna correlativo real atómico).
 *   Si offline → encola en IDB y se sincroniza al reconectar.
 */
export default function FormView() {
    const toast = useToast();
    const { online, refrescarPending } = useNetwork();
    const refs = useRef({});

    const [form, setForm] = useState(() => ({
        ...equipoVacio(),
    }));
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(false);
    const [proximoCorrelativo, setProximoCorrelativo] = useState(null);
    const [estadoCorrelativo, setEstadoCorrelativo] = useState("cargando");
    const [fotoFile, setFotoFile] = useState(null);
    const [fotoError, setFotoError] = useState(null);

    // Para detectar duplicados: cargamos todos los equipos al montar.
    const [equipos, setEquipos] = useState([]);

    useEffect(() => {
        let cancelado = false;
        (async () => {
            // 1. Cargar cache primero (offline-first)
            const cached = await getCachedEquipos();
            if (!cancelado && cached.length > 0) setEquipos(cached);

            // 2. Si online, traer datos frescos
            if (supabase && navigator.onLine) {
                const { data, error } = await supabase
                    .from("equipos")
                    .select("*")
                    .is("deleted_at", null);
                if (!cancelado) {
                    if (error) {
                        if (cached.length === 0)
                            toast.error(error.message);
                    } else {
                        setEquipos(data ?? []);
                        await cacheEquipos(data ?? []);
                    }
                }
            }
        })();
        return () => {
            cancelado = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Preview del próximo correlativo
    useEffect(() => {
        if (!supabase || !navigator.onLine) {
            setEstadoCorrelativo("error");
            return;
        }
        let cancelado = false;
        (async () => {
            try {
                const { data, error } = await supabase.rpc(
                    "preview_next_correlativo",
                );
                if (cancelado) return;
                if (error) {
                    setEstadoCorrelativo("error");
                } else {
                    setProximoCorrelativo(data);
                    setEstadoCorrelativo("listo");
                }
            } catch {
                if (!cancelado) setEstadoCorrelativo("error");
            }
        })();
        return () => {
            cancelado = true;
        };
    }, []);

    // Detección de duplicado de N° interno dentro de la bodega
    const numeroInternoTomado = useMemo(() => {
        const set = new Set();
        for (const e of equipos) {
            if (e.deleted_at) continue;
            if (e.numero_interno && e.bodega) {
                set.add(`${e.bodega}|${e.numero_interno}`);
            }
        }
        return set;
    }, [equipos]);

    const handleChange = (name, value) => {
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errores[name]) {
            setErrores((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const toggleElementoFaltante = (el) => {
        setForm((prev) => {
            const current = prev.elementos_faltantes ?? [];
            const next = current.includes(el)
                ? current.filter((x) => x !== el)
                : [...current, el];
            return { ...prev, elementos_faltantes: next };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Si hay foto adjunta pero no hay red, no podemos subirla a Storage.
        // Bloqueamos: el usuario debe esperar a reconectar para incluir foto.
        if (fotoFile && !online) {
            toast.warning(
                "Sin conexión: no se puede subir la foto. Quítala o espera a tener red.",
            );
            return;
        }

        const payload = {
            ...form,
            marca: form.marca === MARCA_OTRA ? form.marcaOtra : form.marca,
            marcaOtra: undefined,
            elementos_faltantes: form.elementos_faltantes ?? [],
            horometro: form.horometro === "" ? null : Number(form.horometro),
            // foto_enviada es true/false según si hay archivo; foto_url se
            // completa después de subir a Storage si estamos online.
            foto_enviada: Boolean(fotoFile),
        };

        const { ok, errores: errsValidacion } = validarEquipo(payload);
        if (!ok) {
            const errsObj = {};
            for (const msg of errsValidacion) errsObj._general = msg;
            setErrores(errsObj);
            toast.error(errsValidacion[0] ?? "Revisa los campos");
            return;
        }

        setErrores({});
        setGuardando(true);
        try {
            if (!online) {
                await enqueuePendingWrite({
                    type: "insert_equipo",
                    payload: { equipo: payload },
                });
                await refrescarPending();
                toast.info(
                    "Sin conexión — guardado localmente, se sincronizará al reconectar.",
                );
                setForm(equipoVacio());
                setFotoFile(null);
                setFotoError(null);
            } else {
                // 1. Subir foto a Storage si hay
                let fotoUrl = null;
                if (fotoFile) {
                    setFotoError(null);
                    try {
                        // Pedimos el correlativo que se va a asignar
                        // para incluirlo en el path del archivo
                        // (convención: {correlativo:04d}_{timestamp}.ext).
                        // Esto evita que todas las fotos queden en
                        // `0001_*.ext` como pasaba antes.
                        const { data: corrPreview, error: corrErr } =
                            await supabase.rpc("preview_next_correlativo");
                        if (corrErr) throw corrErr;
                        const corrParaPath =
                            typeof corrPreview === "number"
                                ? corrPreview
                                : Number(corrPreview) || 1;
                        fotoUrl = await uploadFotoEquipo(
                            fotoFile,
                            corrParaPath,
                        );
                    } catch (uploadErr) {
                        setFotoError(
                            uploadErr?.message ?? "Error al subir foto",
                        );
                        toast.error(
                            "No se pudo subir la foto: " +
                                (uploadErr?.message ?? "error desconocido"),
                        );
                        setGuardando(false);
                        return;
                    }
                }

                const payloadFinal = { ...payload, foto_url: fotoUrl };
                const { data, error } = await supabase.rpc("insert_equipo", {
                    p_equipo: payloadFinal,
                });
                if (error) throw error;
                const inserted = Array.isArray(data) ? data[0] : data;
                toast.success(
                    `Equipo registrado con N° ${inserted?.correlativo ?? "?"}${
                        fotoUrl ? " · foto guardada" : ""
                    }`,
                );
                setForm(equipoVacio());
                setFotoFile(null);
                setFotoError(null);
            }
        } catch (err) {
            toast.error(err?.message ?? "No se pudo guardar");
        } finally {
            setGuardando(false);
        }
    };

    const niDuplicado =
        form.numero_interno.trim() &&
        form.bodega &&
        numeroInternoTomado.has(
            `${form.bodega}|${form.numero_interno.trim()}`,
        );

    return (
        <>
            <EquiposHeader />
            <form
                onSubmit={handleSubmit}
                className="space-y-5"
                noValidate
                autoComplete="off"
            >
            {/* Card: Identificación */}
            <fieldset className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.10)] sm:p-6">
                <legend className="px-2 text-[0.78rem] font-bold uppercase tracking-wider text-slate-500">
                    Identificación
                </legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block text-[0.85rem] font-semibold text-slate-900">
                        Bodega
                        <select
                            value={form.bodega}
                            onChange={(e) =>
                                handleChange("bodega", e.target.value)
                            }
                            ref={(el) => (refs.current.bodega = el)}
                            className={clasesInput}
                        >
                            <option value="">— Selecciona —</option>
                            {BODEGAS.map((b) => (
                                <option key={b} value={b}>
                                    {b}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block text-[0.85rem] font-semibold text-slate-900">
                        Tipo de equipo
                        <select
                            value={form.tipo_equipo}
                            onChange={(e) =>
                                handleChange("tipo_equipo", e.target.value)
                            }
                            ref={(el) => (refs.current.tipo_equipo = el)}
                            className={clasesInput}
                        >
                            <option value="">— Selecciona —</option>
                            {TIPOS_EQUIPO.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block text-[0.85rem] font-semibold text-slate-900">
                        N° interno
                        <input
                            type="text"
                            value={form.numero_interno}
                            onChange={(e) =>
                                handleChange(
                                    "numero_interno",
                                    e.target.value,
                                )
                            }
                            ref={(el) =>
                                (refs.current.numero_interno = el)
                            }
                            placeholder="Ej. AP-042"
                            className={`${clasesInput} ${
                                niDuplicado
                                    ? "border-rose-400 focus:border-rose-600 focus:ring-rose-600/15"
                                    : ""
                            }`}
                        />
                        {niDuplicado && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                ⚠️ Ya existe un equipo con este N° interno en
                                {form.bodega}. Verifica antes de guardar.
                            </p>
                        )}
                    </label>

                    <label className="block text-[0.85rem] font-semibold text-slate-900">
                        N° de serie
                        <input
                            type="text"
                            value={form.numero_serie}
                            onChange={(e) =>
                                handleChange("numero_serie", e.target.value)
                            }
                            ref={(el) => (refs.current.numero_serie = el)}
                            placeholder="S/N del fabricante"
                            className={clasesInput}
                        />
                    </label>

                    <label className="block text-[0.85rem] font-semibold text-slate-900">
                        Marca
                        <select
                            value={form.marca}
                            onChange={(e) =>
                                handleChange("marca", e.target.value)
                            }
                            className={clasesInput}
                        >
                            <option value="">— Selecciona —</option>
                            {MARCAS.map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                            <option value={MARCA_OTRA}>Otra…</option>
                        </select>
                    </label>

                    {form.marca === MARCA_OTRA && (
                        <label className="block text-[0.85rem] font-semibold text-slate-900">
                            Especifica la marca
                            <input
                                type="text"
                                value={form.marcaOtra}
                                onChange={(e) =>
                                    handleChange("marcaOtra", e.target.value)
                                }
                                placeholder="Nombre de la marca"
                                className={clasesInput}
                            />
                        </label>
                    )}

                    <label className="block text-[0.85rem] font-semibold text-slate-900">
                        Modelo
                        <input
                            type="text"
                            value={form.modelo}
                            onChange={(e) =>
                                handleChange("modelo", e.target.value)
                            }
                            placeholder="Modelo del fabricante"
                            className={clasesInput}
                        />
                    </label>

                    <label className="block text-[0.85rem] font-semibold text-slate-900">
                        Ubicación actual
                        <input
                            type="text"
                            value={form.ubicacion_actual}
                            onChange={(e) =>
                                handleChange(
                                    "ubicacion_actual",
                                    e.target.value,
                                )
                            }
                            placeholder="Ej. Patio 1, Galpón B"
                            className={clasesInput}
                        />
                    </label>
                </div>
            </fieldset>

            {/* Card: Estado operacional */}
            <fieldset className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.10)] sm:p-6">
                <legend className="px-2 text-[0.78rem] font-bold uppercase tracking-wider text-slate-500">
                    Estado operacional
                </legend>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {ESTADOS.map((est) => (
                        <label
                            key={est}
                            className={`flex cursor-pointer flex-col gap-1 rounded-[10px] border-[1.5px] p-3 transition ${
                                form.estado_operacional === est
                                    ? "border-blue-600 bg-blue-50/40"
                                    : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    name="estado_operacional"
                                    value={est}
                                    checked={form.estado_operacional === est}
                                    onChange={(e) =>
                                        handleChange(
                                            "estado_operacional",
                                            e.target.value,
                                        )
                                    }
                                    className="h-4 w-4 accent-blue-600"
                                />
                                <span className="text-sm font-bold text-slate-900">
                                    {est}
                                </span>
                            </span>
                            <span className="text-xs text-slate-500">
                                {ESTADO_DESCRIPCIONES[est]}
                            </span>
                        </label>
                    ))}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block text-[0.85rem] font-semibold text-slate-900">
                        Horómetro
                        <input
                            type="number"
                            min="0"
                            value={form.horometro}
                            onChange={(e) =>
                                handleChange("horometro", e.target.value)
                            }
                            placeholder="Horas de uso"
                            className={clasesInput}
                        />
                    </label>

                    <label className="block text-[0.85rem] font-semibold text-slate-900">
                        Responsable
                        <input
                            type="text"
                            value={form.responsable}
                            onChange={(e) =>
                                handleChange("responsable", e.target.value)
                            }
                            placeholder="Tu nombre completo"
                            className={clasesInput}
                        />
                    </label>
                </div>

                <div className="mt-4">
                    <p className="text-[0.85rem] font-semibold text-slate-900">
                        Elementos faltantes
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {ELEMENTOS_FALTANTES.map((el) => (
                            <label
                                key={el}
                                className="flex cursor-pointer items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm transition hover:bg-slate-50"
                            >
                                <input
                                    type="checkbox"
                                    checked={(
                                        form.elementos_faltantes ?? []
                                    ).includes(el)}
                                    onChange={() => toggleElementoFaltante(el)}
                                    className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                                />
                                <span className="text-slate-700">{el}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <label className="mt-4 block text-[0.85rem] font-semibold text-slate-900">
                    Observaciones
                    <textarea
                        rows={3}
                        value={form.observaciones}
                        onChange={(e) =>
                            handleChange("observaciones", e.target.value)
                        }
                        placeholder="Detalles relevantes, condiciones, notas…"
                        className={`${clasesInput} resize-y`}
                    />
                </label>

                <label className="mt-4 flex items-center gap-2 text-[0.85rem] font-semibold text-slate-900">
                    <span>Foto del equipo</span>
                </label>
                <p className="mt-1 text-xs text-slate-500">
                    Antes se enviaba al correo <strong>{PHOTO_EMAIL}</strong>.
                    Ahora se sube directamente al bucket{" "}
                    <code className="rounded bg-slate-100 px-1 text-[0.7rem]">
                        equipos-fotos
                    </code>{" "}
                    en Supabase Storage.
                </p>
                <div className="mt-2">
                    <PhotoUpload
                        value={fotoFile}
                        onChange={(f) => {
                            setFotoFile(f);
                            setFotoError(null);
                        }}
                        error={fotoError}
                        disabled={guardando}
                    />
                </div>
            </fieldset>

            {/* Footer con preview correlativo + submit */}
            <div className="flex flex-col gap-3 rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.10)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="text-sm text-slate-600">
                    {estadoCorrelativo === "listo" && proximoCorrelativo && (
                        <>
                            Próximo correlativo disponible:{" "}
                            <strong className="font-extrabold text-slate-900 tabular-nums">
                                #{String(proximoCorrelativo).padStart(4, "0")}
                            </strong>
                        </>
                    )}
                    {estadoCorrelativo === "cargando" && (
                        <>Consultando correlativo…</>
                    )}
                    {estadoCorrelativo === "error" && (
                        <span className="text-amber-700">
                            No se pudo consultar correlativo. Se asignará al
                            guardar.
                        </span>
                    )}
                </div>
                <button
                    type="submit"
                    disabled={guardando}
                    className="rounded-[10px] bg-blue-600 px-6 py-3 text-base font-bold text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] transition hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {guardando
                        ? "Guardando…"
                        : online
                          ? "💾 Registrar equipo"
                          : "💾 Guardar (sin conexión)"}
                </button>
            </div>
        </form>
        </>
    );
}