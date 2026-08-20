import { useCallback, useEffect, useRef, useState } from "react";
import { useAsync } from "../../hooks/useAsync";
import { supabase } from "../../services/supabase";
import { formatearFecha } from "../../utils/format";
import { iconoPorMotivo } from "../../lib/equiposConstants";
import { getFotoUrlCached } from "../../lib/equiposStorage";
import {
    useModalTransition,
    useRetainedValue,
} from "../../hooks/useModalTransition";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import Skeleton from "../ui/Skeleton";

const CATEGORIA_LABEL = {
    renovacion: "Renovación",
    garantia: "Garantía",
    fallo: "Fallo postventa",
};

const MOVIMIENTOS_POR_CARGA = 50;

/**
 * Modal que muestra el historial completo de movimientos de un equipo.
 *
 * Carga on-demand desde Supabase con JOIN a `clientes` y `equipos`
 * (para mostrar razón social del cliente y equipo relacionado en swap).
 *
 * Si los aliases PostgREST fallan (por nomenclatura del FK), hace
 * fallback a dos queries paralelas + map en cliente.
 */
export default function MovimientoHistorialModal({
    open,
    equipo: equipoProp,
    onClose,
}) {
    const dialogRef = useRef(null);
    const transicion = useModalTransition(open);
    const equipo = useRetainedValue(
        equipoProp,
        open && Boolean(equipoProp),
    );
    const [cantidadCargada, setCantidadCargada] = useState(1);

    useEffect(() => {
        if (open) setCantidadCargada(1);
    }, [open, equipo?.id]);

    const cargarHistorial = useCallback(async () => {
        if (!equipo?.id || !supabase) {
            return { movimientos: [], hayMas: false };
        }
        const limite = cantidadCargada * MOVIMIENTOS_POR_CARGA;
        // Query principal con JOIN. PostgREST embedded resources.
        const { data, error: err } = await supabase
            .from("equipos_movimientos")
            .select(
                `
                *,
                cliente_origen:clientes!equipos_movimientos_cliente_origen_id_fkey(id, razon_social),
                cliente_destino:clientes!equipos_movimientos_cliente_destino_id_fkey(id, razon_social),
                equipo_relacionado:equipos!equipos_movimientos_equipo_relacionado_id_fkey(id, correlativo, marca, modelo, numero_interno),
                autor:perfiles!equipos_movimientos_creado_por_fkey(nombre_completo)
                `,
            )
            .eq("equipo_id", equipo.id)
            .order("fecha", { ascending: false })
            .range(0, limite - 1);

        if (!err) {
            const movimientos = data ?? [];
            return {
                movimientos,
                hayMas: movimientos.length === limite,
            };
        }

        // Fallback: si los aliases no resuelven, cargar por separado
        const fallback = await cargarFallback(equipo.id, limite);
        if (fallback.error) throw new Error(fallback.error);
        return fallback;
    }, [cantidadCargada, equipo?.id]);

    const {
        data: historial = { movimientos: [], hayMas: false },
        loading: cargando,
        error,
    } = useAsync(cargarHistorial, {
        immediate: open,
        deps: [open, equipo?.id, cantidadCargada],
        errorContexto: "cargar historial de movimientos",
    });
    const movimientos = historial?.movimientos ?? [];

    useDialogA11y(open, { dialogRef, onClose });

    if (!transicion.renderizar || !equipo) return null;

    return (
        <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="historial-mov-titulo"
            tabIndex={-1}
            className={`fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4 ${transicion.claseFondo}`}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className={`max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-3 shadow-2xl sm:rounded-2xl sm:p-6 dark:bg-carbon-900 ${transicion.clasePanel}`}
                style={{
                    paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
                }}
            >
                <header className="sticky top-0 z-10 mb-4 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/95 px-1 pb-3 pt-1 backdrop-blur dark:border-white/5 dark:bg-carbon-900/95 sm:static sm:border-0 sm:bg-transparent sm:pb-0 sm:pt-0 sm:backdrop-blur-none dark:sm:bg-transparent">
                    <div className="min-w-0">
                        <h2
                            id="historial-mov-titulo"
                            className="text-base font-bold text-slate-900 dark:text-slate-100 sm:text-[1.15rem]"
                        >
                            📜 Historial de movimientos
                        </h2>
                        <p className="mt-1 truncate text-sm text-slate-600 dark:text-neutral-400">
                            {equipo.tipo_equipo || "Equipo"} · {equipo.marca}{" "}
                            {equipo.modelo} ·{" "}
                            <span className="font-mono font-semibold">
                                {equipo.numero_interno}
                            </span>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        data-dialog-autofocus
                        aria-label="Cerrar"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-5 w-5"
                        >
                            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                        </svg>
                    </button>
                </header>

                {cargando && (
                    <div className="space-y-3" aria-busy="true" aria-label="Cargando movimientos">
                        {Array.from({ length: 4 }, (_, index) => (
                            <div
                                key={index}
                                className="rounded-2xl border border-slate-200 p-4 dark:border-white/10"
                            >
                                <div className="flex justify-between gap-4">
                                    <Skeleton className="h-5 w-40" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                                <Skeleton className="mt-3 h-4 w-3/4" />
                                <Skeleton className="mt-2 h-4 w-1/2" />
                            </div>
                        ))}
                    </div>
                )}

                {error && (
                    <div className="rounded-[10px] border-l-4 border-rose-600 bg-rose-50 px-3 py-2.5 text-sm text-rose-900 dark:bg-rose-500/10 dark:text-rose-300">
                        Error al cargar: {error}
                    </div>
                )}

                {!cargando && !error && movimientos.length === 0 && (
                    <div className="rounded-[10px] border-2 border-dashed border-slate-300 px-5 py-7 text-center text-sm text-slate-500 dark:border-white/15 dark:text-neutral-400">
                        Este equipo aún no tiene movimientos registrados.{" "}
                        <strong>
                            Solo se registran traslados posteriores al alta.
                        </strong>
                    </div>
                )}

                {!cargando && !error && movimientos.length > 0 && (
                    <ol className="relative space-y-1">
                        {movimientos.map((m, idx) => {
                            const esUltimo = idx === 0;
                            const siguienteMasNuevo = movimientos[idx - 1];
                            const desde = new Date(m.fecha);
                            const hasta = esUltimo
                                ? new Date()
                                : new Date(siguienteMasNuevo.fecha);
                            const duracion = duracionLegible(hasta - desde);

                            return (
                                <li
                                    key={m.id}
                                    className="relative pb-3 pl-10 last:pb-0 sm:pl-12"
                                >
                                    {/* Línea conectora del timeline */}
                                    {idx < movimientos.length - 1 && (
                                        <span
                                            className="absolute bottom-0 left-4 top-9 w-px bg-slate-200 dark:bg-white/10 sm:left-5"
                                            aria-hidden="true"
                                        />
                                    )}
                                    {/* Nodo con icono del tipo de movimiento */}
                                    <span
                                        className={`absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full text-base sm:h-10 sm:w-10 ${
                                            esUltimo
                                                ? "bg-brand-600 text-white shadow-[0_2px_8px_rgba(232,18,26,0.35)]"
                                                : "bg-slate-900 text-white dark:bg-white/10"
                                        }`}
                                        aria-hidden="true"
                                    >
                                        {iconoPorMotivo(m.motivo)}
                                    </span>

                                    <div
                                        className={`min-w-0 rounded-xl border p-3 ${
                                            esUltimo
                                                ? "border-brand-300 bg-brand-50/50 dark:border-brand-500/30 dark:bg-brand-500/10"
                                                : "border-slate-200 bg-white dark:border-white/10 dark:bg-carbon-800"
                                        }`}
                                    >
                                        <div className="flex flex-wrap items-center gap-1.5 text-sm">
                                            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white dark:bg-white/10">
                                                {formatearFecha(m.fecha)}
                                            </span>
                                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-800 dark:bg-violet-500/10 dark:text-violet-400">
                                                {m.motivo}
                                            </span>
                                            {m.movimiento_padre_id && (
                                                <span
                                                    className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-400"
                                                    title="Esta fila es parte de un cambio de equipo (swap) bidireccional"
                                                >
                                                    🔁 Pierna de swap
                                                </span>
                                            )}
                                            {m.categoria && (
                                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800 dark:bg-sky-500/10 dark:text-sky-400">
                                                    {CATEGORIA_LABEL[
                                                        m.categoria
                                                    ] ?? m.categoria}
                                                </span>
                                            )}
                                            {esUltimo && (
                                                <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                                                    Actual
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-2 break-words text-sm font-semibold text-slate-900 dark:text-slate-100 sm:text-[0.92rem]">
                                            <span className="block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-neutral-400 sm:inline sm:text-inherit sm:normal-case sm:tracking-normal">
                                                Desde
                                            </span>{" "}
                                            {renderOrigen(m)}
                                            <span className="mx-1.5 text-slate-400 dark:text-neutral-500 sm:mx-2">
                                                →
                                            </span>
                                            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-neutral-400 sm:hidden">
                                                Hasta{" "}
                                            </span>
                                            <span className="text-brand-700 dark:text-brand-400">
                                                {renderDestino(m)}
                                            </span>
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                                            ⏱️{" "}
                                            {esUltimo
                                                ? `Lleva ${duracion} aquí`
                                                : `Estuvo ${duracion} en este destino`}
                                        </p>
                                        {(m.ubicacion_origen ||
                                            m.ubicacion_destino) && (
                                            <p className="mt-1 break-words text-xs text-slate-500 dark:text-neutral-400">
                                                <span className="font-medium text-slate-600 dark:text-neutral-300">
                                                    {m.ubicacion_origen ?? "—"}
                                                </span>
                                                <span className="mx-1.5 text-slate-400 dark:text-neutral-500">
                                                    →
                                                </span>
                                                <span className="font-medium text-slate-700 dark:text-slate-200">
                                                    {m.ubicacion_destino ?? "—"}
                                                </span>
                                            </p>
                                        )}
                                        {m.equipo_relacionado && (
                                            <p className="mt-1 break-words text-xs text-slate-600 dark:text-neutral-400">
                                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                                    Equipo relacionado:{" "}
                                                </span>
                                                #
                                                {String(
                                                    m.equipo_relacionado
                                                        .correlativo,
                                                ).padStart(4, "0")}{" "}
                                                · {m.equipo_relacionado.marca}{" "}
                                                {m.equipo_relacionado.modelo}
                                                {m.equipo_relacionado
                                                    .numero_interno && (
                                                    <>
                                                        {" "}
                                                        ·{" "}
                                                        <span className="font-mono">
                                                            {
                                                                m
                                                                    .equipo_relacionado
                                                                    .numero_interno
                                                            }
                                                        </span>
                                                    </>
                                                )}
                                            </p>
                                        )}
                                        <BateriaContexto
                                            contexto={m.bateria_contexto}
                                        />
                                        <p className="mt-1.5 text-xs text-slate-500 dark:text-neutral-400">
                                            Responsable:{" "}
                                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                                                {m.responsable}
                                            </span>
                                        </p>
                                        <p className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-neutral-300">
                                            Registrado por: {m.autor?.nombre_completo ?? "Registro anterior al inicio de sesión"}
                                        </p>
                                        {m.notas && (
                                            <p className="mt-1.5 break-words rounded border-l-[3px] border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200">
                                                {m.notas}
                                            </p>
                                        )}
                                        {m.horometro !== null &&
                                            m.horometro !== undefined && (
                                                <p className="mt-1.5 text-xs text-slate-600 dark:text-neutral-300">
                                                    ⏱ Horómetro:{" "}
                                                    <strong>{m.horometro} h</strong>
                                                </p>
                                            )}
                                        {(m.numero_acta ||
                                            m.numero_guia_despacho) && (
                                            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-neutral-300">
                                                {m.numero_acta && (
                                                    <span>
                                                        📄 Acta:{" "}
                                                        <strong>{m.numero_acta}</strong>
                                                    </span>
                                                )}
                                                {m.numero_guia_despacho && (
                                                    <span>
                                                        🚚 Guía:{" "}
                                                        <strong>
                                                            {m.numero_guia_despacho}
                                                        </strong>
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {m.foto_url && (
                                            <MovimientoFoto
                                                path={m.foto_url}
                                            />
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}

                {!cargando && !error && historial?.hayMas && (
                    <button
                        type="button"
                        onClick={() =>
                            setCantidadCargada((actual) => actual + 1)
                        }
                        className="mt-4 min-h-[44px] w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-800 transition hover:bg-blue-100 active:scale-[0.99] dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                    >
                        Cargar 50 movimientos anteriores
                    </button>
                )}
            </div>
        </div>
    );
}

function renderOrigen(m) {
    if (m.cliente_origen?.razon_social) {
        return `🏢 ${m.cliente_origen.razon_social}`;
    }
    return m.bodega_origen ?? "—";
}

function renderDestino(m) {
    if (m.cliente_destino?.razon_social) {
        return `🏢 ${m.cliente_destino.razon_social}`;
    }
    if (m.destino_externo) return `🔧 ${m.destino_externo}`;
    return m.bodega_destino ?? "—";
}

function BateriaContexto({ contexto }) {
    if (!contexto) return null;

    if (contexto.tipo === "acompanante") {
        return (
            <div className="mt-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-900 dark:border-cyan-500/25 dark:bg-cyan-500/10 dark:text-cyan-100">
                🔋 <strong>Batería que acompaña al equipo:</strong>{" "}
                <span className="font-mono font-bold">
                    {contexto.numero_interno || "—"}
                </span>{" "}
                · Serie {contexto.numero_serie || "—"}
            </div>
        );
    }

    if (contexto.tipo === "cambio") {
        const anterior = contexto.anterior;
        const nueva = contexto.nueva;
        return (
            <div className="mt-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-900 dark:border-cyan-500/25 dark:bg-cyan-500/10 dark:text-cyan-100">
                <p className="font-bold">🔋 Movimiento de batería</p>
                <p className="mt-1">
                    {anterior ? (
                        <>
                            Sale <strong className="font-mono">{anterior.numero_interno}</strong>
                            {anterior.numero_serie ? ` · Serie ${anterior.numero_serie}` : ""}
                            {anterior.destino ? ` → ${anterior.destino}` : ""}
                        </>
                    ) : (
                        "Equipo sin batería registrada"
                    )}
                </p>
                <p className="mt-0.5">
                    {nueva ? (
                        <>
                            Entra <strong className="font-mono">{nueva.numero_interno}</strong>
                            {nueva.numero_serie ? ` · Serie ${nueva.numero_serie}` : ""}
                        </>
                    ) : (
                        "El equipo queda sin batería asociada"
                    )}
                </p>
            </div>
        );
    }

    return null;
}

/**
 * Convierte un intervalo en ms a texto legible:
 * "menos de 1 día", "1 día", "45 días", "~3 meses".
 */
function duracionLegible(ms) {
    const dias = Math.floor(ms / 86400000);
    if (dias < 1) return "menos de 1 día";
    if (dias === 1) return "1 día";
    if (dias < 60) return `${dias} días`;
    const meses = Math.round(dias / 30);
    return `~${meses} ${meses === 1 ? "mes" : "meses"}`;
}

/**
 * Thumbnail de la foto adjunta a un movimiento. El path vive en un
 * bucket privado: resuelve la signed URL on-demand (con cache) y al
 * hacer click abre la imagen completa en pestaña nueva.
 */
function MovimientoFoto({ path }) {
    const [url, setUrl] = useState(null);

    useEffect(() => {
        let vivo = true;
        getFotoUrlCached(path).then((u) => {
            if (vivo) setUrl(u);
        });
        return () => {
            vivo = false;
        };
    }, [path]);

    if (!url) return null;

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block"
            title="Ver foto completa"
        >
            <img
                src={url}
                alt="Foto del movimiento"
                className="h-16 w-16 rounded-[8px] border border-slate-200 object-cover transition hover:opacity-80 dark:border-white/15"
                loading="lazy"
            />
        </a>
    );
}

/**
 * Fallback cuando los aliases PostgREST no resuelven correctamente.
 * Carga los movimientos, luego los clientes y equipo relacionado por
 * separado y los une en cliente.
 */
async function cargarFallback(equipoId, limite) {
    try {
        const { data: movs, error: movErr } = await supabase
            .from("equipos_movimientos")
            .select("*")
            .eq("equipo_id", equipoId)
            .order("fecha", { ascending: false })
            .range(0, limite - 1);
        if (movErr) return { error: movErr.message };

        const clienteIds = new Set();
        const equipoRelIds = new Set();
        const perfilIds = new Set();
        for (const m of movs ?? []) {
            if (m.cliente_origen_id) clienteIds.add(m.cliente_origen_id);
            if (m.cliente_destino_id) clienteIds.add(m.cliente_destino_id);
            if (m.equipo_relacionado_id)
                equipoRelIds.add(m.equipo_relacionado_id);
            if (m.creado_por) perfilIds.add(m.creado_por);
        }

        const clientesById = new Map();
        if (clienteIds.size > 0) {
            const { data: clientes } = await supabase
                .from("clientes")
                .select("id, razon_social")
                .in("id", [...clienteIds]);
            for (const c of clientes ?? []) clientesById.set(c.id, c);
        }

        const equiposById = new Map();
        if (equipoRelIds.size > 0) {
            const { data: equipos } = await supabase
                .from("equipos")
                .select("id, correlativo, marca, modelo, numero_interno")
                .in("id", [...equipoRelIds]);
            for (const e of equipos ?? []) equiposById.set(e.id, e);
        }

        const perfilesById = new Map();
        if (perfilIds.size > 0) {
            const { data: perfiles } = await supabase
                .from("perfiles")
                .select("id, nombre_completo")
                .in("id", [...perfilIds]);
            for (const perfil of perfiles ?? []) perfilesById.set(perfil.id, perfil);
        }

        const movimientos = (movs ?? []).map((m) => ({
            ...m,
            cliente_origen: clientesById.get(m.cliente_origen_id) ?? null,
            cliente_destino: clientesById.get(m.cliente_destino_id) ?? null,
            equipo_relacionado: equiposById.get(m.equipo_relacionado_id) ?? null,
            autor: perfilesById.get(m.creado_por) ?? null,
        }));

        return {
            movimientos,
            hayMas: movimientos.length === limite,
        };
    } catch (err) {
        return { error: err?.message ?? "Error inesperado" };
    }
}
