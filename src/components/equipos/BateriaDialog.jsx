import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../../context/ToastContext";
import { useAsync } from "../../hooks/useAsync";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import {
    useModalTransition,
    useRetainedValue,
} from "../../hooks/useModalTransition";
import { supabase } from "../../services/supabase";
import { withRetry } from "../../utils/withRetry";

const clasesInput =
    "mt-1 block w-full rounded-[10px] border-[1.5px] border-slate-300 bg-white px-3 py-2.5 text-base font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100 dark:placeholder-neutral-500";

function normalizarHorometro(valor) {
    return String(valor ?? "")
        .replace(",", ".")
        .replace(/[^\d.]/g, "");
}

function horometroValido(valor, actual) {
    if (!/^\d+(\.\d+)?$/.test(String(valor).trim())) return false;
    const numero = Number(valor);
    return (
        Number.isFinite(numero) &&
        numero >= 0 &&
        (actual === null || actual === undefined || numero >= Number(actual))
    );
}

export default function BateriaDialog({ open, equipo, onSubmit, onCancel }) {
    const toast = useToast();
    const dialogRef = useRef(null);
    const transicion = useModalTransition(open);
    const equipoVisible = useRetainedValue(equipo, open);
    const [bateriaNuevaId, setBateriaNuevaId] = useState("");
    const [bodegaRetiro, setBodegaRetiro] = useState("Antillanca");
    const [estadoRetiro, setEstadoRetiro] = useState("En reparación");
    const [horometro, setHorometro] = useState("");
    const [responsable, setResponsable] = useState("");
    const [motivo, setMotivo] = useState("Cambio de batería");
    const [notas, setNotas] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(false);
    const [versionFormulario, setVersionFormulario] = useState(0);

    useUnsavedChanges(
        {
            bateriaNuevaId,
            bodegaRetiro,
            estadoRetiro,
            horometro,
            responsable,
            motivo,
            notas,
        },
        {
            habilitado: open && !guardando,
            resetKey: versionFormulario,
        },
    );

    const cargarOpciones = useCallback(async () => {
        if (!equipo?.id || !supabase) return { actual: null, disponibles: [] };

        const [actualResponse, disponiblesResponse] = await Promise.all([
            withRetry(() =>
                supabase
                    .from("baterias")
                    .select("id, numero_interno, numero_serie, voltaje, amperaje, estado")
                    .eq("equipo_id", equipo.id)
                    .maybeSingle(),
            ),
            withRetry(() =>
                supabase
                    .from("baterias")
                    .select("id, numero_interno, numero_serie, voltaje, amperaje, bodega")
                    .is("equipo_id", null)
                    .eq("estado", "Disponible")
                    .order("numero_interno", { ascending: true }),
            ),
        ]);

        if (actualResponse.error) throw actualResponse.error;
        if (disponiblesResponse.error) throw disponiblesResponse.error;
        return {
            actual: actualResponse.data ?? null,
            disponibles: disponiblesResponse.data ?? [],
        };
    }, [equipo?.id]);

    const {
        data: opciones = { actual: null, disponibles: [] },
        loading: cargando,
        refetch: recargarOpciones,
    } = useAsync(cargarOpciones, {
        immediate: false,
        deps: [open, equipo?.id],
        errorContexto: "cargar baterías disponibles",
        onError: (error) => toast.error(error.message),
    });

    useEffect(() => {
        if (!open) return;
        setBateriaNuevaId("");
        setBodegaRetiro("Antillanca");
        setEstadoRetiro("En reparación");
        setHorometro(
            equipo?.horometro === null || equipo?.horometro === undefined
                ? ""
                : String(equipo.horometro),
        );
        setResponsable("");
        setMotivo("Cambio de batería");
        setNotas("");
        setBusqueda("");
        setErrores({});
        setGuardando(false);
        setVersionFormulario((version) => version + 1);
        recargarOpciones();
    }, [open, equipo?.id, equipo?.horometro, recargarOpciones]);

    useDialogA11y(open, {
        dialogRef,
        onClose: onCancel,
        bloquearCierre: guardando,
    });

    const disponiblesFiltradas = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        if (!texto) return opciones.disponibles;
        return opciones.disponibles.filter((bateria) =>
            [bateria.numero_interno, bateria.numero_serie, bateria.bodega]
                .join(" ")
                .toLowerCase()
                .includes(texto),
        );
    }, [busqueda, opciones.disponibles]);

    if (!transicion.renderizar || !equipoVisible) return null;

    const validar = () => {
        const next = {};
        if (!responsable.trim()) {
            next.responsable = "El responsable es obligatorio";
        }
        if (!horometroValido(horometro, equipoVisible.horometro)) {
            next.horometro =
                equipoVisible.horometro === null ||
                equipoVisible.horometro === undefined
                    ? "Ingresa el horómetro actualizado"
                    : `Debe ser igual o mayor que ${equipoVisible.horometro} h`;
        }
        if (!opciones.actual && !bateriaNuevaId) {
            next.bateria = "Selecciona una batería para asociar";
        } else if (opciones.actual && !bateriaNuevaId) {
            next.bateria = "Selecciona una batería nueva o el retiro sin reemplazo";
        }
        return next;
    };

    const enviar = async (event) => {
        event.preventDefault();
        const next = validar();
        if (Object.keys(next).length > 0) {
            setErrores(next);
            return;
        }

        setGuardando(true);
        try {
            const exito = await onSubmit?.({
                p_equipo_id: equipoVisible.id,
                p_responsable: responsable.trim(),
                p_bateria_nueva_id:
                    bateriaNuevaId && bateriaNuevaId !== "__retirar__"
                        ? Number(bateriaNuevaId)
                        : null,
                p_bodega_retiro: bodegaRetiro,
                p_motivo: motivo.trim() || "Cambio de batería",
                p_notas: notas.trim() || null,
                p_estado_retiro: estadoRetiro,
                p_horometro: Number(horometro),
            });
            if (exito === false) return;
        } finally {
            setGuardando(false);
        }
    };

    const bateriaActual = opciones.actual;
    const quitarSinReemplazo = bateriaNuevaId === "__retirar__";

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
                aria-labelledby="bateria-dialog-title"
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
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">
                            Control de batería
                        </p>
                        <h2
                            id="bateria-dialog-title"
                            className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100"
                        >
                            {bateriaActual ? "Cambiar batería" : "Asociar batería"}
                        </h2>
                        <p className="mt-1 truncate text-sm text-slate-500 dark:text-neutral-400">
                            {equipoVisible.tipo_equipo} · N° {equipoVisible.numero_interno}
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
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                            Batería actualmente asociada
                        </p>
                        {cargando ? (
                            <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">Cargando…</p>
                        ) : bateriaActual ? (
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                                <strong className="font-mono text-lg text-slate-900 dark:text-slate-100">
                                    {bateriaActual.numero_interno}
                                </strong>
                                <span className="text-sm text-slate-600 dark:text-neutral-300">
                                    Serie {bateriaActual.numero_serie}
                                </span>
                                <span className="text-sm text-slate-600 dark:text-neutral-300">
                                    {bateriaActual.voltaje} V · {bateriaActual.amperaje} Ah
                                </span>
                            </div>
                        ) : (
                            <p className="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                                Este equipo todavía no tiene una batería del inventario asociada.
                            </p>
                        )}
                    </div>

                    <label className="mt-4 block">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            Nueva batería
                        </span>
                        <input
                            type="search"
                            value={busqueda}
                            onChange={(event) => setBusqueda(event.target.value)}
                            placeholder="Buscar por N° interno, serie o bodega"
                            className={clasesInput}
                            disabled={cargando || guardando}
                        />
                        <select
                            value={bateriaNuevaId}
                            onChange={(event) => {
                                setBateriaNuevaId(event.target.value);
                                setErrores((prev) => ({ ...prev, bateria: undefined }));
                            }}
                            className={clasesInput}
                            disabled={cargando || guardando}
                        >
                            <option value="">Selecciona qué hacer</option>
                            {bateriaActual && (
                                <option value="__retirar__">
                                    Retirar sin reemplazo
                                </option>
                            )}
                            {disponiblesFiltradas.map((bateria) => (
                                <option key={bateria.id} value={bateria.id}>
                                    {bateria.numero_interno} · Serie {bateria.numero_serie} · {bateria.voltaje} V / {bateria.amperaje} Ah · {bateria.bodega}
                                </option>
                            ))}
                        </select>
                        {errores.bateria && (
                            <span className="mt-1 block text-xs font-semibold text-red-600 dark:text-red-400">
                                {errores.bateria}
                            </span>
                        )}
                        {!cargando && disponiblesFiltradas.length === 0 && (
                            <span className="mt-1 block text-xs text-slate-500 dark:text-neutral-400">
                                No hay baterías disponibles con esa búsqueda.
                            </span>
                        )}
                    </label>

                    {quitarSinReemplazo && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
                            La batería retirada quedará en <strong>{bodegaRetiro}</strong> con estado <strong>{estadoRetiro}</strong>.
                        </div>
                    )}

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="block">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                Destino de la batería retirada
                            </span>
                            <select
                                value={bodegaRetiro}
                                onChange={(event) => setBodegaRetiro(event.target.value)}
                                className={clasesInput}
                                disabled={guardando || !bateriaActual}
                            >
                                <option value="Antillanca">Antillanca</option>
                                <option value="Cordillera">Cordillera</option>
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                Horómetro actualizado
                            </span>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={horometro}
                                onChange={(event) => {
                                    setHorometro(normalizarHorometro(event.target.value));
                                    setErrores((prev) => ({ ...prev, horometro: undefined }));
                                }}
                                className={`${clasesInput} ${errores.horometro ? "border-red-500" : ""}`}
                                placeholder="Horas actuales del equipo"
                                disabled={guardando}
                            />
                            {errores.horometro && (
                                <span className="mt-1 block text-xs font-semibold text-red-600 dark:text-red-400">
                                    {errores.horometro}
                                </span>
                            )}
                        </label>
                        <label className="block">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                Estado de la retirada
                            </span>
                            <select
                                value={estadoRetiro}
                                onChange={(event) => setEstadoRetiro(event.target.value)}
                                className={clasesInput}
                                disabled={guardando || !bateriaActual}
                            >
                                <option value="En reparación">En reparación</option>
                                <option value="Disponible">Disponible</option>
                                <option value="Baja">Baja</option>
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                Responsable
                            </span>
                            <input
                                value={responsable}
                                onChange={(event) => {
                                    setResponsable(event.target.value);
                                    setErrores((prev) => ({ ...prev, responsable: undefined }));
                                }}
                                className={`${clasesInput} ${errores.responsable ? "border-red-500" : ""}`}
                                placeholder="Quién realiza el cambio"
                                disabled={guardando}
                            />
                            {errores.responsable && (
                                <span className="mt-1 block text-xs font-semibold text-red-600 dark:text-red-400">
                                    {errores.responsable}
                                </span>
                            )}
                        </label>
                    </div>

                    <label className="mt-4 block">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            Motivo
                        </span>
                        <input
                            value={motivo}
                            onChange={(event) => setMotivo(event.target.value)}
                            className={clasesInput}
                            disabled={guardando}
                        />
                    </label>

                    <label className="mt-4 block">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            Notas <span className="font-normal text-slate-400">(opcional)</span>
                        </span>
                        <textarea
                            value={notas}
                            onChange={(event) => setNotas(event.target.value)}
                            rows={3}
                            className={`${clasesInput} resize-y`}
                            placeholder="Falla, reparación, observación del cambio"
                            disabled={guardando}
                        />
                    </label>
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
                        disabled={guardando || cargando}
                        className="min-h-[44px] rounded-xl bg-blue-600 px-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {guardando ? "Guardando…" : "Guardar cambio"}
                    </button>
                </footer>
            </form>
        </div>
    );
}
