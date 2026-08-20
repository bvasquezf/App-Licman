import { useMemo, useState } from "react";
import EmptyState from "../ui/EmptyState";
import TareaCard from "./TareaCard";
import { fechaLocalISO } from "../../lib/tareasData";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function inicioMes(fecha) {
    return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
}

function moverMes(fecha, cantidad) {
    return new Date(fecha.getFullYear(), fecha.getMonth() + cantidad, 1);
}

function construirDias(mes) {
    const primero = inicioMes(mes);
    const desfase = (primero.getDay() + 6) % 7;
    const diasMes = new Date(
        primero.getFullYear(),
        primero.getMonth() + 1,
        0,
    ).getDate();
    const total = Math.ceil((desfase + diasMes) / 7) * 7;
    const inicio = new Date(
        primero.getFullYear(),
        primero.getMonth(),
        1 - desfase,
    );
    return Array.from({ length: total }, (_, indice) => {
        const fecha = new Date(inicio);
        fecha.setDate(inicio.getDate() + indice);
        return fecha;
    });
}

function colorTarea(tarea) {
    if (tarea.estado === "Finalizada") {
        return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200";
    }
    if (tarea.estado === "En proceso") {
        return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200";
    }
    if (tarea.prioridad === "Urgente") {
        return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200";
    }
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200";
}

export default function TareasCalendario({
    tareas,
    onEditar,
    onCambiarEstado,
    onNuevaFecha,
}) {
    const hoy = fechaLocalISO();
    const [mesActual, setMesActual] = useState(() => inicioMes(new Date()));
    const [fechaSeleccionada, setFechaSeleccionada] = useState(hoy);
    const [fechasExpandidas, setFechasExpandidas] = useState(() => new Set());
    const dias = useMemo(() => construirDias(mesActual), [mesActual]);
    const tareasPorFecha = useMemo(() => {
        const grupos = new Map();
        for (const tarea of tareas) {
            if (!tarea.fecha_programada || tarea.estado === "Cancelada") continue;
            const grupo = grupos.get(tarea.fecha_programada) ?? [];
            grupo.push(tarea);
            grupos.set(tarea.fecha_programada, grupo);
        }
        return grupos;
    }, [tareas]);

    const cambiarMes = (cantidad) => {
        const siguiente = moverMes(mesActual, cantidad);
        setMesActual(siguiente);
        setFechaSeleccionada(fechaLocalISO(siguiente));
        setFechasExpandidas(new Set());
    };

    const irHoy = () => {
        const actual = new Date();
        setMesActual(inicioMes(actual));
        setFechaSeleccionada(fechaLocalISO(actual));
        setFechasExpandidas(new Set());
    };

    const tituloMes = new Intl.DateTimeFormat("es-CL", {
        month: "long",
        year: "numeric",
    }).format(mesActual);
    const tareasSeleccionadas = tareasPorFecha.get(fechaSeleccionada) ?? [];

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-carbon-900">
            <header className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
                <div>
                    <h2 className="text-lg font-extrabold capitalize text-slate-900 dark:text-slate-100">
                        {tituloMes}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                        Los días vacíos muestran dónde queda espacio para nuevas visitas.
                    </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <button
                        type="button"
                        onClick={() => cambiarMes(-1)}
                        className="min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5"
                        aria-label="Mes anterior"
                    >
                        ←
                    </button>
                    <button
                        type="button"
                        onClick={irHoy}
                        className="min-h-[44px] rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10"
                    >
                        Hoy
                    </button>
                    <button
                        type="button"
                        onClick={() => cambiarMes(1)}
                        className="min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5"
                        aria-label="Mes siguiente"
                    >
                        →
                    </button>
                </div>
            </header>

            {/* Calendario compacto para iPhone: se elige un día y abajo
                aparecen sus trabajos con acciones grandes. */}
            <div className="p-3 xl:hidden">
                <div className="grid grid-cols-7 gap-1">
                    {DIAS_SEMANA.map((dia) => (
                        <div
                            key={dia}
                            className="py-1 text-center text-xs font-bold text-slate-400 dark:text-neutral-500"
                        >
                            {dia.slice(0, 1)}
                        </div>
                    ))}
                    {dias.map((fecha) => {
                        const iso = fechaLocalISO(fecha);
                        const cantidad = tareasPorFecha.get(iso)?.length ?? 0;
                        const delMes =
                            fecha.getMonth() === mesActual.getMonth();
                        const seleccionada = iso === fechaSeleccionada;
                        return (
                            <button
                                key={iso}
                                type="button"
                                onClick={() => setFechaSeleccionada(iso)}
                                className={`relative min-h-[44px] rounded-xl text-sm font-bold transition ${
                                    seleccionada
                                        ? "bg-blue-600 text-white"
                                        : iso === hoy
                                          ? "bg-blue-50 text-blue-700 ring-1 ring-blue-300 dark:bg-blue-500/10 dark:text-blue-300"
                                          : delMes
                                            ? "text-slate-700 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-white/5"
                                            : "text-slate-300 dark:text-neutral-700"
                                }`}
                                aria-label={`${iso}, ${cantidad} tareas`}
                            >
                                {fecha.getDate()}
                                {cantidad > 0 && (
                                    <span
                                        className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                                            seleccionada ? "bg-white" : "bg-brand-500"
                                        }`}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="mt-4 border-t border-slate-100 pt-4 dark:border-white/5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                            {new Intl.DateTimeFormat("es-CL", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                            }).format(
                                new Date(`${fechaSeleccionada}T12:00:00`),
                            )}
                        </p>
                        <button
                            type="button"
                            onClick={() => onNuevaFecha(fechaSeleccionada)}
                            className="min-h-[44px] shrink-0 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white"
                        >
                            + Agendar
                        </button>
                    </div>
                    <div className="space-y-3">
                        {tareasSeleccionadas.map((tarea) => (
                            <TareaCard
                                key={tarea.id}
                                tarea={tarea}
                                onEditar={onEditar}
                                onCambiarEstado={onCambiarEstado}
                                compacta
                            />
                        ))}
                        {tareasSeleccionadas.length === 0 && (
                            <EmptyState
                                icon="🗓️"
                                title="Día disponible"
                                description="No hay tareas programadas para esta fecha."
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Mes completo solo cuando las siete columnas caben realmente. */}
            <div className="hidden overflow-hidden xl:block">
                <div className="min-w-[900px]">
                    <div className="grid grid-cols-7 border-b border-slate-200 dark:border-white/10">
                        {DIAS_SEMANA.map((dia) => (
                            <div
                                key={dia}
                                className="px-2 py-2.5 text-center text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-neutral-400"
                            >
                                {dia}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7">
                        {dias.map((fecha) => {
                            const iso = fechaLocalISO(fecha);
                            const tareasDia = tareasPorFecha.get(iso) ?? [];
                            const expandida = fechasExpandidas.has(iso);
                            const tareasVisibles = expandida
                                ? tareasDia
                                : tareasDia.slice(0, 3);
                            const delMes =
                                fecha.getMonth() === mesActual.getMonth();
                            return (
                                <div
                                    key={iso}
                                    className={`min-h-[190px] border-b border-r border-slate-100 p-2 dark:border-white/5 ${
                                        delMes
                                            ? "bg-white dark:bg-carbon-900"
                                            : "bg-slate-50/70 dark:bg-black/10"
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => onNuevaFecha(iso)}
                                        className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-extrabold transition hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 ${
                                            iso === hoy
                                                ? "bg-blue-600 text-white"
                                                : delMes
                                                  ? "text-slate-700 dark:text-neutral-300"
                                                  : "text-slate-300 dark:text-neutral-600"
                                        }`}
                                        title="Agendar tarea en esta fecha"
                                        aria-label={`Agendar tarea el ${iso}`}
                                    >
                                        {fecha.getDate()}
                                    </button>
                                    <div className="mt-1 space-y-1.5">
                                        {tareasVisibles.map((tarea) => (
                                            <button
                                                key={tarea.id}
                                                type="button"
                                                onClick={() => onEditar(tarea)}
                                                className={`block min-h-[44px] w-full rounded-lg border px-2 py-1.5 text-left text-xs font-bold leading-tight transition hover:brightness-95 ${colorTarea(tarea)}`}
                                                title={`${tarea.titulo} · ${tarea.tecnicos?.join(", ") || "Sin técnico"}`}
                                            >
                                                <span className="block truncate">
                                                    {tarea.hora_inicio
                                                        ? `${String(tarea.hora_inicio).slice(0, 5)} `
                                                        : ""}
                                                    {tarea.titulo}
                                                </span>
                                                <span className="mt-0.5 block truncate font-medium opacity-80">
                                                    {tarea.tecnicos?.join(", ") || "Sin técnico"}
                                                </span>
                                            </button>
                                        ))}
                                        {tareasDia.length > 3 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setFechasExpandidas((prev) => {
                                                        const next = new Set(prev);
                                                        if (next.has(iso)) next.delete(iso);
                                                        else next.add(iso);
                                                        return next;
                                                    })
                                                }
                                                className="min-h-[44px] w-full rounded-lg px-2 text-left text-xs font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
                                            >
                                                {expandida
                                                    ? "Mostrar menos"
                                                    : `+${tareasDia.length - 3} más`}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
