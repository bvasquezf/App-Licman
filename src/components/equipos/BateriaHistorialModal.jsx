import { useCallback, useEffect, useRef } from "react";
import { useToast } from "../../context/ToastContext";
import { useAsync } from "../../hooks/useAsync";
import {
    useModalTransition,
    useRetainedValue,
} from "../../hooks/useModalTransition";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { supabase } from "../../services/supabase";
import { withRetry } from "../../utils/withRetry";
import { formatearFechaCorta } from "../../utils/format";
import Skeleton from "../ui/Skeleton";

const ICONOS = {
    Ingreso: "📥",
    Asignación: "🔋",
    Retiro: "↩️",
    "Movimiento con equipo": "🚚",
    Baja: "🗑️",
};

export default function BateriaHistorialModal({ open, bateria, onClose }) {
    const toast = useToast();
    const dialogRef = useRef(null);
    const transicion = useModalTransition(open);
    const bateriaVisible = useRetainedValue(bateria, open);

    const cargar = useCallback(async () => {
        if (!bateria?.id || !supabase) return [];
        const { data, error } = await withRetry(() =>
            supabase
                .from("baterias_movimientos")
                .select("id, tipo_movimiento, bodega, responsable, motivo, notas, fecha, equipo_id, equipo_movimiento_id, cliente_id, destino_externo, ubicacion_destino, creado_por, autor:perfiles!baterias_movimientos_creado_por_fkey(nombre_completo)")
                .eq("bateria_id", bateria.id)
                .order("fecha", { ascending: false }),
        );
        if (error) throw error;

        const movimientos = data ?? [];
        const equipoIds = [
            ...new Set(movimientos.map((m) => m.equipo_id).filter(Boolean)),
        ];
        const clienteIds = [
            ...new Set(movimientos.map((m) => m.cliente_id).filter(Boolean)),
        ];

        const [equiposResponse, clientesResponse] = await Promise.all([
            equipoIds.length > 0
                ? withRetry(() =>
                      supabase
                          .from("equipos")
                          .select("id, numero_interno, tipo_equipo, marca, modelo")
                          .in("id", equipoIds),
                  )
                : Promise.resolve({ data: [], error: null }),
            clienteIds.length > 0
                ? withRetry(() =>
                      supabase
                          .from("clientes")
                          .select("id, razon_social")
                          .in("id", clienteIds),
                  )
                : Promise.resolve({ data: [], error: null }),
        ]);

        if (equiposResponse.error) throw equiposResponse.error;
        if (clientesResponse.error) throw clientesResponse.error;

        const equiposById = new Map(
            (equiposResponse.data ?? []).map((equipo) => [equipo.id, equipo]),
        );
        const clientesById = new Map(
            (clientesResponse.data ?? []).map((cliente) => [cliente.id, cliente]),
        );

        return movimientos.map((movimiento) => ({
            ...movimiento,
            equipo: equiposById.get(movimiento.equipo_id) ?? null,
            cliente: clientesById.get(movimiento.cliente_id) ?? null,
        }));
    }, [bateria?.id]);

    const {
        data: movimientos = [],
        loading,
        refetch: recargar,
    } = useAsync(cargar, {
        immediate: false,
        deps: [open, bateria?.id],
        errorContexto: "cargar historial de batería",
        onError: (error) => toast.error(error.message),
    });

    useEffect(() => {
        if (open) recargar();
    }, [open, recargar]);

    useDialogA11y(open, { dialogRef, onClose });

    if (!transicion.renderizar || !bateriaVisible) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4 ${transicion.claseFondo}`}
            onClick={onClose}
            role="presentation"
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="bateria-historial-title"
                tabIndex={-1}
                onClick={(event) => event.stopPropagation()}
                className={`flex max-h-[calc(100dvh-1rem)] w-full max-w-xl flex-col overflow-hidden rounded-t-[18px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.25)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-[18px] dark:border-white/10 dark:bg-carbon-900 ${transicion.clasePanel}`}
            >
                <header
                    className="flex items-start justify-between border-b border-slate-200 px-5 pb-4 dark:border-white/10 sm:px-6"
                    style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
                >
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-400">
                            Trazabilidad
                        </p>
                        <h2
                            id="bateria-historial-title"
                            className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100"
                        >
                            Historial de batería
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                            {bateriaVisible.numero_interno} · Serie {bateriaVisible.numero_serie}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        data-dialog-autofocus
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-xl text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
                        aria-label="Cerrar"
                    >
                        ×
                    </button>
                </header>

                <div className="overflow-y-auto p-5 sm:p-6">
                    {loading ? (
                        <div className="space-y-3" aria-busy="true" aria-label="Cargando historial">
                            {Array.from({ length: 4 }, (_, index) => (
                                <div
                                    key={index}
                                    className="rounded-2xl border border-slate-200 p-4 dark:border-white/10"
                                >
                                    <Skeleton className="h-5 w-40" />
                                    <Skeleton className="mt-3 h-4 w-3/4" />
                                    <Skeleton className="mt-2 h-4 w-1/2" />
                                </div>
                            ))}
                        </div>
                    ) : movimientos.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-500 dark:text-neutral-400">
                            Esta batería todavía no tiene movimientos registrados.
                        </p>
                    ) : (
                        <ol className="space-y-3">
                            {movimientos.map((movimiento) => (
                                <li
                                    key={movimiento.id}
                                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/[0.04]"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-900 dark:text-slate-100">
                                                {ICONOS[movimiento.tipo_movimiento] ?? "📌"} {movimiento.tipo_movimiento}
                                            </p>
                                            <p className="mt-1 text-sm text-slate-600 dark:text-neutral-300">
                                                {descripcionUbicacion(movimiento)}
                                            </p>
                                        </div>
                                        <time className="shrink-0 text-xs font-semibold text-slate-500 dark:text-neutral-400">
                                            {formatearFechaCorta(movimiento.fecha)}
                                        </time>
                                    </div>
                                    <p className="mt-2 text-xs text-slate-600 dark:text-neutral-300">
                                        Responsable: {movimiento.responsable}
                                        {movimiento.motivo ? ` · ${movimiento.motivo}` : ""}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-neutral-300">
                                        Registrado por: {movimiento.autor?.nombre_completo ?? "Registro anterior al inicio de sesión"}
                                    </p>
                                    {movimiento.equipo_movimiento_id && (
                                        <p className="mt-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                                            🔗 Enlazado al mismo movimiento del equipo
                                        </p>
                                    )}
                                    {movimiento.notas && (
                                        <p className="mt-1 text-sm text-slate-600 dark:text-neutral-300">
                                            {movimiento.notas}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            </div>
        </div>
    );
}

function descripcionUbicacion(movimiento) {
    const equipo = movimiento.equipo;
    const equipoTexto = equipo
        ? `Equipo ${equipo.numero_interno || equipo.id}`
        : movimiento.equipo_id
          ? `Equipo ID ${movimiento.equipo_id}`
          : null;

    if (movimiento.cliente?.razon_social) {
        return `${equipoTexto ? `${equipoTexto} · ` : ""}Cliente: ${movimiento.cliente.razon_social}`;
    }
    if (movimiento.destino_externo) {
        return `${equipoTexto ? `${equipoTexto} · ` : ""}${movimiento.destino_externo}`;
    }
    if (movimiento.bodega) {
        return `${equipoTexto ? `${equipoTexto} · ` : ""}Bodega: ${movimiento.bodega}`;
    }
    return equipoTexto || "Sin ubicación";
}
