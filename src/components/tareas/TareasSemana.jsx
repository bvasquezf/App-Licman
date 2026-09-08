import { useEffect, useMemo, useRef, useState } from "react";
import EmptyState from "../ui/EmptyState";
import TareasListaPaginada from "./TareasListaPaginada";
import {
    compararTareas,
    duracionTareaMinutos,
    estaTareaActiva,
    fechaLocalISO,
    formatearDuracionMinutos,
    formatearFechaTarea,
} from "../../lib/tareasData";

function inicioSemana(fecha) {
    const dia = new Date(fecha);
    const indice = (dia.getDay() + 6) % 7;
    dia.setHours(12, 0, 0, 0);
    dia.setDate(dia.getDate() - indice);
    return dia;
}

function desplazarSemana(fecha, cantidad) {
    const siguiente = new Date(fecha);
    siguiente.setDate(siguiente.getDate() + cantidad * 7);
    return siguiente;
}

function construirDias(inicio) {
    return Array.from({ length: 7 }, (_, indice) => {
        const dia = new Date(inicio);
        dia.setDate(inicio.getDate() + indice);
        return dia;
    });
}

function etiquetaDia(fecha) {
    return new Intl.DateTimeFormat("es-CL", {
        weekday: "short",
        day: "numeric",
        month: "short",
    })
        .format(fecha)
        .replace(".", "");
}

export default function TareasSemana({
    tareas,
    onEditar,
    onCambiarEstado,
}) {
    const [semana, setSemana] = useState(() => inicioSemana(new Date()));
    const [diaSeleccionado, setDiaSeleccionado] = useState(() =>
        fechaLocalISO(new Date()),
    );
    const selectorDiasRef = useRef(null);
    const dias = useMemo(() => construirDias(semana), [semana]);
    const tareasActivas = useMemo(
        () => tareas.filter(estaTareaActiva),
        [tareas],
    );
    const tareasPorFecha = useMemo(() => {
        const grupos = new Map();
        for (const tarea of tareasActivas) {
            if (!tarea.fecha_programada) continue;
            const grupo = grupos.get(tarea.fecha_programada) ?? [];
            grupo.push(tarea);
            grupos.set(tarea.fecha_programada, grupo);
        }
        for (const grupo of grupos.values()) grupo.sort(compararTareas);
        return grupos;
    }, [tareasActivas]);
    const diasISO = dias.map(fechaLocalISO);
    const tareasSemana = diasISO.flatMap(
        (fecha) => tareasPorFecha.get(fecha) ?? [],
    );
    const sinFecha = tareasActivas.filter((tarea) => !tarea.fecha_programada);
    const minutosSemana = tareasSemana.reduce(
        (total, tarea) => total + (duracionTareaMinutos(tarea) ?? 0),
        0,
    );

    useEffect(() => {
        const seleccionado = selectorDiasRef.current?.querySelector(
            '[aria-pressed="true"]',
        );
        seleccionado?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
        });
    }, [diaSeleccionado, semana]);
    const sinAsignar = tareasSemana.filter(
        (tarea) => !tarea.tecnico_ids?.length,
    ).length;
    const sinHorario = tareasSemana.filter(
        (tarea) => duracionTareaMinutos(tarea) === null,
    ).length;
    const cambioSemana = (cantidad) => {
        const siguiente = desplazarSemana(semana, cantidad);
        setSemana(siguiente);
        setDiaSeleccionado(fechaLocalISO(siguiente));
    };
    const irHoy = () => {
        const hoy = new Date();
        setSemana(inicioSemana(hoy));
        setDiaSeleccionado(fechaLocalISO(hoy));
    };
    const rango = `${formatearFechaTarea(fechaLocalISO(dias[0]), { sinAnio: true })} – ${formatearFechaTarea(fechaLocalISO(dias[6]))}`;

    return (
        <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_6px_20px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-carbon-900 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                            Planificación semanal
                        </p>
                        <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                            {rango}
                        </h2>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <button type="button" onClick={() => cambioSemana(-1)} className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5" aria-label="Semana anterior">←</button>
                        <button type="button" onClick={irHoy} className="min-h-[44px] rounded-xl border border-blue-200 px-3 text-xs font-extrabold text-blue-700 hover:bg-blue-50 dark:border-blue-500/25 dark:text-blue-300 dark:hover:bg-blue-500/10">Hoy</button>
                        <button type="button" onClick={() => cambioSemana(1)} className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5" aria-label="Semana siguiente">→</button>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {[
                        ["Trabajos", tareasSemana.length],
                        ["Duración de trabajos", formatearDuracionMinutos(minutosSemana)],
                        ["Sin fecha", sinFecha.length],
                        ["Sin asignar", sinAsignar],
                        ["Sin horario", sinHorario],
                    ].map(([etiqueta, valor]) => (
                        <div key={etiqueta} className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                            <p className="text-lg font-black text-slate-900 dark:text-white">{valor}</p>
                            <p className="text-xs font-semibold text-slate-500 dark:text-neutral-400">{etiqueta}</p>
                        </div>
                    ))}
                </div>
            </section>

            <div
                ref={selectorDiasRef}
                className="scrollbar-none flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-1 xl:hidden"
                aria-label="Días de la semana"
            >
                {dias.map((dia) => {
                    const iso = fechaLocalISO(dia);
                    const cantidad = tareasPorFecha.get(iso)?.length ?? 0;
                    return (
                        <button
                            key={iso}
                            type="button"
                            onClick={() => setDiaSeleccionado(iso)}
                            aria-pressed={diaSeleccionado === iso}
                            className={`min-h-[48px] shrink-0 snap-center rounded-xl border px-3 text-left ${
                                diaSeleccionado === iso
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-carbon-900 dark:text-neutral-300"
                            }`}
                        >
                            <span className="block text-xs font-extrabold capitalize">{etiquetaDia(dia)}</span>
                            <span className="text-xs font-semibold opacity-80">{cantidad} trabajo{cantidad === 1 ? "" : "s"}</span>
                        </button>
                    );
                })}
            </div>

            {sinFecha.length > 0 && (
                <section className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-4 dark:border-amber-500/30 dark:bg-amber-500/5 sm:p-5">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <h2 className="text-lg font-black text-amber-950 dark:text-amber-200">
                                ⚠ Sin fecha / por programar
                            </h2>
                            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                                Estas tareas quedan fuera de los días de la semana hasta que se les asigne una fecha.
                            </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-amber-800 shadow-sm dark:bg-white/10 dark:text-amber-200">
                            {sinFecha.length}
                        </span>
                    </div>
                    <TareasListaPaginada
                        tareas={sinFecha}
                        onEditar={onEditar}
                        onCambiarEstado={onCambiarEstado}
                    />
                </section>
            )}

            <div className="xl:grid xl:grid-cols-4 xl:gap-3">
                {dias.map((dia) => {
                    const iso = fechaLocalISO(dia);
                    const visibles = tareasPorFecha.get(iso) ?? [];
                    const mostrar = iso === diaSeleccionado;
                    return (
                        <section
                            key={iso}
                            className={`${mostrar ? "block" : "hidden xl:block"} min-w-0 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 dark:border-white/10 dark:bg-white/[0.025]`}
                        >
                            <header className="mb-3 flex items-center justify-between gap-2">
                                <h3 className="text-sm font-black capitalize text-slate-900 dark:text-white">{etiquetaDia(dia)}</h3>
                            </header>
                            {visibles.length > 0 ? (
                                <TareasListaPaginada
                                    tareas={visibles}
                                    onEditar={onEditar}
                                    onCambiarEstado={onCambiarEstado}
                                    compacta
                                    limiteInicial={6}
                                    incremento={6}
                                    className="space-y-3"
                                />
                            ) : (
                                <EmptyState icon="☀️" title="Día disponible" description="No hay trabajos activos programados." />
                            )}
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
