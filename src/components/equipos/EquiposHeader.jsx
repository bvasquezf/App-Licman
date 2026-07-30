/**
 * EquiposHeader
 * --------------
 * Header compartido para las 4 vistas de Equipos (registrar,
 * inventario, papelera, exportar).
 *
 * Muestra SIEMPRE:
 *   - Branding "Inventario Licman" + indicador online
 *   - Chips de conteo (TOTAL + "En cliente" + cada bodega)
 *   - Card "Correlativo asignado" con botón refresh
 *
 * Props opcionales:
 *   - activeFilter ("todas" | nombreBodega | BODEGA_EN_CLIENTE): chip activo
 *   - onFilterBodega (bodega => void): si se pasa, los chips son
 *     clickeables y filtran la lista al hacer click. Si NO se pasa,
 *     los chips solo muestran el conteo (modo "solo lectura").
 *   - showCorrelativo (boolean, default true): si false, NO renderiza
 *     la card de "Correlativo asignado" (ni hace el RPC). Útil en
 *     vistas donde solo importa el conteo (papelera, exportar, etc.).
 *
 * El componente se autocarga: hace su propio fetch del conteo y del
 * próximo correlativo. Refresca al recibir focus en la ventana (cubre
 * el caso de cambiar de pestaña).
 *
 * Fase 2: se agrega el chip "En cliente" (sentinel BODEGA_EN_CLIENTE)
 * para filtrar equipos con cliente_id IS NOT NULL.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { BODEGAS, BODEGA_EN_CLIENTE } from "../../lib/equiposConstants";
import { useAsync } from "../../hooks/useAsync";
import { useNetwork } from "../../context/NetworkContext";
import { supabase } from "../../services/supabase";

export default function EquiposHeader({
    activeFilter = "todas",
    onFilterBodega = null,
    showCorrelativo = true,
}) {
    const { online, pending, sincronizando, flush } = useNetwork();
    const [recargando, setRecargando] = useState(false);

    const fetchEquipos = useCallback(async () => {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from("equipos")
            .select("bodega, cliente_id")
            .is("deleted_at", null);
        if (error) throw error;
        return data ?? [];
    }, []);

    const {
        data: equipos = [],
        refetch: recargarEquipos,
    } = useAsync(fetchEquipos, {
        errorContexto: "cargar conteo de equipos",
        // Silencioso: si falla, los chips quedan en 0 hasta el próximo
        // refresh. El handler padre puede mostrar un toast si quiere.
    });

    const fetchCorrelativo = useCallback(async () => {
        if (!supabase || !navigator.onLine) {
            return { estado: "error", data: null };
        }
        const { data, error } = await supabase.rpc("preview_next_correlativo");
        if (error) return { estado: "error", data: null };
        return { estado: "listo", data };
    }, []);

    const { data: correlativoResult, refetch: recargarCorrelativo } = useAsync(
        fetchCorrelativo,
        {
            immediate: showCorrelativo,
            deps: [showCorrelativo],
            errorContexto: "consultar próximo correlativo",
        },
    );

    const proximoCorrelativo = correlativoResult?.data ?? null;
    const estadoCorrelativo = !showCorrelativo
        ? "oculto"
        : !correlativoResult
          ? "cargando"
          : correlativoResult.estado;

    const refrescarTodo = async () => {
        if (recargando) return;
        setRecargando(true);
        try {
            const tareas = [recargarEquipos()];
            if (showCorrelativo) tareas.push(recargarCorrelativo());
            await Promise.all(tareas);
        } finally {
            setRecargando(false);
        }
    };

    // Refrescar al volver a la pestaña/ventana (cubre navegación entre
    // tabs del grupo Equipos sin recargar la página completa).
    useEffect(() => {
        const onFocus = () => {
            recargarEquipos();
            if (showCorrelativo) recargarCorrelativo();
        };
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [showCorrelativo, recargarEquipos, recargarCorrelativo]);

    const conteoPorBodega = useMemo(() => {
        const map = { todas: equipos.length };
        for (const b of BODEGAS) map[b] = 0;
        let enCliente = 0;
        for (const e of equipos) {
            if (e.cliente_id) {
                enCliente += 1;
            } else if (e.bodega && map[e.bodega] !== undefined) {
                map[e.bodega] += 1;
            }
        }
        map[BODEGA_EN_CLIENTE] = enCliente;
        return map;
    }, [equipos]);

    const handleChipClick = (bodega) => {
        if (onFilterBodega) onFilterBodega(bodega);
    };

    return (
        <div className="space-y-4">
            {/* Header oscuro: branding + chips de conteo */}
            <header
                role="region"
                aria-label="Resumen del inventario de equipos"
                className="rounded-[14px] border border-slate-900 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-[0_10px_30px_rgba(15,23,42,0.25)] sm:p-5"
            >
                <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Branding */}
                    <div className="flex items-center gap-3">
                        <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-sm font-extrabold text-white shadow-sm"
                            style={{
                                background:
                                    "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)",
                            }}
                            aria-hidden="true"
                        >
                            IL
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-base font-extrabold tracking-tight text-white sm:text-lg">
                                Inventario Licman
                            </h1>
                            <p className="text-[0.72rem] font-medium text-slate-300 sm:text-xs">
                                Levantamiento en terreno · 3 bodegas
                            </p>
                        </div>
                    </div>

                    {/* Indicador online + chips contadores */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wider ${
                                online
                                    ? "bg-emerald-500/15 text-emerald-300"
                                    : "bg-rose-500/20 text-rose-300"
                            }`}
                            aria-live="polite"
                        >
                            <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                    online
                                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                                        : "bg-rose-400"
                                }`}
                            />
                            {online ? "En línea" : "Sin conexión"}
                        </span>

                        {/* Sync manual: cambios pendientes en cola offline */}
                        {pending > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (online && !sincronizando) flush();
                                }}
                                disabled={!online || sincronizando}
                                title={
                                    online
                                        ? "Sincronizar ahora"
                                        : "Se sincronizará al recuperar la conexión"
                                }
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider transition ${
                                    online
                                        ? "bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 active:scale-95"
                                        : "bg-slate-500/20 text-slate-300"
                                } disabled:cursor-default`}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                    className={sincronizando ? "animate-spin" : ""}
                                >
                                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                    <path d="M3 3v5h5" />
                                </svg>
                                {sincronizando
                                    ? "Sincronizando…"
                                    : `${pending} pendiente${pending === 1 ? "" : "s"}`}
                            </button>
                        )}

                        {/* Chip TOTAL */}
                        <button
                            type="button"
                            onClick={() => handleChipClick("todas")}
                            disabled={!onFilterBodega}
                            aria-pressed={activeFilter === "todas"}
                            className={`flex min-w-[64px] flex-col items-center justify-center rounded-[10px] border-[1.5px] px-2.5 py-1 transition active:scale-95 disabled:cursor-default ${
                                activeFilter === "todas"
                                    ? "border-white bg-white/10"
                                    : onFilterBodega
                                      ? "border-white/20 hover:border-white/40 hover:bg-white/5"
                                      : "border-white/15"
                            }`}
                        >
                            <span className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-300">
                                Total
                            </span>
                            <span className="text-base font-extrabold leading-tight text-white tabular-nums">
                                {conteoPorBodega.todas}
                            </span>
                        </button>

                        {/* Chip "En cliente" — Fase 2 */}
                        <button
                            type="button"
                            onClick={() => handleChipClick(BODEGA_EN_CLIENTE)}
                            disabled={!onFilterBodega}
                            aria-pressed={activeFilter === BODEGA_EN_CLIENTE}
                            className={`flex min-w-[64px] flex-col items-center justify-center rounded-[10px] border-[1.5px] px-2.5 py-1 transition active:scale-95 disabled:cursor-default ${
                                activeFilter === BODEGA_EN_CLIENTE
                                    ? "border-sky-300 bg-sky-400/15"
                                    : onFilterBodega
                                      ? "border-sky-300/40 hover:border-sky-300 hover:bg-sky-400/10"
                                      : "border-sky-300/30"
                            }`}
                        >
                            <span className="text-[0.6rem] font-bold uppercase tracking-wider text-sky-200">
                                En cliente
                            </span>
                            <span className="text-base font-extrabold leading-tight text-white tabular-nums">
                                {conteoPorBodega[BODEGA_EN_CLIENTE] ?? 0}
                            </span>
                        </button>

                        {/* Chips por bodega */}
                        {BODEGAS.map((b) => {
                            const count = conteoPorBodega[b] ?? 0;
                            const active = activeFilter === b;
                            return (
                                <button
                                    key={b}
                                    type="button"
                                    onClick={() => handleChipClick(b)}
                                    disabled={!onFilterBodega}
                                    aria-pressed={active}
                                    className={`flex min-w-[64px] flex-col items-center justify-center rounded-[10px] border-[1.5px] px-2.5 py-1 transition active:scale-95 disabled:cursor-default ${
                                        active
                                            ? "border-white bg-white/10"
                                            : onFilterBodega
                                              ? "border-white/20 hover:border-white/40 hover:bg-white/5"
                                              : "border-white/15"
                                    }`}
                                >
                                    <span className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-300">
                                        {b}
                                    </span>
                                    <span className="text-base font-extrabold leading-tight text-white tabular-nums">
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </header>

            {/* Card del correlativo asignado — solo si showCorrelativo */}
            {showCorrelativo && (
                <div
                    className="flex flex-col gap-3 rounded-[14px] border border-blue-200/70 bg-blue-50/40 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center sm:justify-between sm:p-5"
                    role="region"
                    aria-label="Próximo correlativo a asignar"
                >
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <p className="text-[0.7rem] font-bold uppercase tracking-wider text-blue-700">
                            Correlativo asignado
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600">
                            Vista previa. El número real se asigna al guardar.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {estadoCorrelativo === "listo" && proximoCorrelativo ? (
                        <div className="flex h-14 min-w-[100px] items-center justify-center rounded-[12px] bg-slate-900 px-4 shadow-[0_4px_12px_rgba(15,23,42,0.25)]">
                            <span className="text-2xl font-extrabold leading-none text-white tabular-nums">
                                #
                                {String(proximoCorrelativo).padStart(4, "0")}
                            </span>
                        </div>
                    ) : estadoCorrelativo === "cargando" ? (
                        <div className="flex h-14 min-w-[100px] items-center justify-center rounded-[12px] bg-slate-200 px-4">
                            <span className="text-sm font-medium text-slate-500">
                                Consultando…
                            </span>
                        </div>
                    ) : (
                        <div className="flex h-14 min-w-[100px] items-center justify-center rounded-[12px] bg-amber-100 px-4">
                            <span className="text-xs font-medium text-amber-800">
                                No disponible
                            </span>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={refrescarTodo}
                        disabled={recargando}
                        aria-label="Refrescar conteo y correlativo"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-blue-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            className={recargando ? "animate-spin" : ""}
                        >
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                        </svg>
                    </button>
                </div>
                </div>
            )}
        </div>
    );
}