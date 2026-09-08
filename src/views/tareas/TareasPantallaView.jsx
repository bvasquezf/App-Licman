import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import { useTareas } from "../../context/TareasContext";
import {
    compararTareas,
    datosCategoriaRequerimiento,
    estaTareaActiva,
    fechaLocalISO,
    formatearFechaTarea,
} from "../../lib/tareasData";

const COLUMNA_CLASES = {
    azul: "border-blue-400/25 bg-blue-400/10",
    violeta: "border-violet-400/25 bg-violet-400/10",
    alerta: "border-amber-400/30 bg-amber-400/10",
};

function horaCorta(valor) {
    return valor ? String(valor).slice(0, 5) : null;
}

function horaActualizacion(valor) {
    if (!valor) return "Esperando datos";
    return `Actualizado ${new Intl.DateTimeFormat("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).format(valor)}`;
}

function TarjetaPantalla({ tarea, alerta = false }) {
    const horario = horaCorta(tarea.hora_inicio);
    const termino = horaCorta(tarea.hora_fin);
    const categoria = datosCategoriaRequerimiento(
        tarea.categoria_requerimiento,
    );

    return (
        <article
            className={`rounded-2xl border p-4 shadow-[0_14px_35px_rgba(0,0,0,0.16)] 2xl:p-5 ${
                alerta
                    ? "border-amber-300/30 bg-amber-50/[0.08]"
                    : "border-white/10 bg-white/[0.07]"
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wider 2xl:text-sm">
                        <span
                            className={
                                tarea.prioridad === "Urgente"
                                    ? "text-rose-300"
                                    : tarea.prioridad === "Alta"
                                      ? "text-orange-300"
                                      : "text-slate-300"
                            }
                        >
                            {tarea.prioridad}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300">
                            {tarea.tipo === "Terreno" ? "🚐 Terreno" : "🔧 Taller"}
                        </span>
                        <span className="text-blue-300">
                            {categoria.icono} {categoria.etiqueta}
                        </span>
                    </div>
                    <h3 className="mt-2 line-clamp-2 text-lg font-black leading-snug text-white 2xl:text-2xl">
                        {tarea.titulo}
                    </h3>
                </div>
                <span className="shrink-0 font-mono text-xs font-bold text-slate-500 2xl:text-sm">
                    #{String(tarea.id).padStart(4, "0")}
                </span>
            </div>

            <div className="mt-3 space-y-1.5 text-sm font-semibold text-slate-300 2xl:text-base">
                <p>
                    🕐 {horario ?? "Sin horario"}
                    {termino ? `–${termino}` : ""}
                    {tarea.fecha_programada !== fechaLocalISO()
                        ? ` · ${formatearFechaTarea(tarea.fecha_programada, {
                              sinAnio: true,
                          })}`
                        : ""}
                </p>
                <p
                    className={`line-clamp-1 ${
                        tarea.tecnicos?.length ? "" : "text-amber-300"
                    }`}
                >
                    👷 {tarea.tecnicos?.join(", ") || "Sin técnico asignado"}
                </p>
                {tarea.cliente_nombre && (
                    <p className="line-clamp-1">🏢 {tarea.cliente_nombre}</p>
                )}
                {tarea.ubicacion && (
                    <p className="line-clamp-2 text-slate-400">📍 {tarea.ubicacion}</p>
                )}
                {tarea.estado === "En espera" && tarea.motivo_espera && (
                    <p className="line-clamp-2 pt-1 text-amber-200">
                        ⏸ {tarea.motivo_espera}
                    </p>
                )}
            </div>
        </article>
    );
}

function ColumnaPantalla({
    titulo,
    subtitulo,
    tareas,
    tono,
    vacio,
    pagina,
    rotacionPausada,
    alerta = false,
}) {
    const porPagina = 3;
    const cantidadPaginas = Math.max(1, Math.ceil(tareas.length / porPagina));
    const paginaActiva = pagina % cantidadPaginas;
    const inicio = paginaActiva * porPagina;
    const tareasVisibles = tareas.slice(inicio, inicio + porPagina);

    return (
        <section
            className={`min-w-0 rounded-3xl border p-4 2xl:p-6 ${COLUMNA_CLASES[tono]}`}
        >
            <header className="mb-4 flex items-start justify-between gap-3 2xl:mb-5">
                <div>
                    <h2 className="text-xl font-black text-white 2xl:text-3xl">
                        {titulo}
                    </h2>
                    <p className="mt-1 text-sm text-slate-400 2xl:text-base">
                        {subtitulo}
                    </p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-lg font-black tabular-nums text-white 2xl:text-2xl">
                    {tareas.length}
                </span>
            </header>
            {tareasVisibles.length > 0 ? (
                <div className="space-y-3 2xl:space-y-4">
                    {tareasVisibles.map((tarea) => (
                        <TarjetaPantalla key={tarea.id} tarea={tarea} alerta={alerta} />
                    ))}
                    {tareas.length > porPagina && (
                        <p className="px-1 text-center text-xs font-bold text-slate-400 2xl:text-sm">
                            {rotacionPausada
                                ? "Rotación pausada"
                                : "Rotación automática"} · página {paginaActiva + 1} de {cantidadPaginas}
                        </p>
                    )}
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-white/15 px-4 py-10 text-center text-base font-semibold text-slate-400 2xl:py-14 2xl:text-xl">
                    {vacio}
                </div>
            )}
        </section>
    );
}

export default function TareasPantallaView() {
    const { data, loading, error, ultimaActualizacion, actualizarManual } =
        useTareas();
    const [ahora, setAhora] = useState(() => new Date());
    const [pagina, setPagina] = useState(0);
    const [rotacionPausada, setRotacionPausada] = useState(
        () =>
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
            false,
    );
    const [pantallaCompleta, setPantallaCompleta] = useState(
        () => Boolean(document.fullscreenElement),
    );

    useEffect(() => {
        const intervalo = window.setInterval(() => setAhora(new Date()), 30_000);
        return () => window.clearInterval(intervalo);
    }, []);

    useEffect(() => {
        if (rotacionPausada) return undefined;
        const intervalo = window.setInterval(
            () => setPagina((actual) => actual + 1),
            12_000,
        );
        return () => window.clearInterval(intervalo);
    }, [rotacionPausada]);

    useEffect(() => {
        const actualizarEstado = () =>
            setPantallaCompleta(Boolean(document.fullscreenElement));
        document.addEventListener("fullscreenchange", actualizarEstado);
        return () =>
            document.removeEventListener("fullscreenchange", actualizarEstado);
    }, []);

    const resumen = useMemo(() => {
        const hoy = fechaLocalISO(ahora);
        const activas = data.tareas.filter(estaTareaActiva);
        const delDia = data.tareas.filter(
            (tarea) =>
                tarea.fecha_programada === hoy && tarea.estado !== "Cancelada",
        );
        const ejecutando = activas
            .filter((tarea) => tarea.estado === "En proceso")
            .sort(compararTareas);
        const programadas = activas
            .filter(
                (tarea) =>
                    tarea.fecha_programada === hoy &&
                    ["Programada", "Por programar"].includes(tarea.estado) &&
                    tarea.tecnico_ids?.length,
            )
            .sort(compararTareas);
        const alertasPorId = new Map();
        for (const tarea of activas) {
            const atrasada =
                tarea.fecha_programada && tarea.fecha_programada < hoy;
            const incompletaHoy =
                tarea.fecha_programada === hoy && !tarea.tecnico_ids?.length;
            if (
                tarea.estado !== "En proceso" &&
                (tarea.estado === "En espera" || atrasada || incompletaHoy)
            ) {
                alertasPorId.set(tarea.id, tarea);
            }
        }
        const alertas = [...alertasPorId.values()].sort(compararTareas);

        return {
            hoy,
            delDia,
            ejecutando,
            programadas,
            alertas,
            finalizadas: delDia.filter((tarea) => tarea.estado === "Finalizada")
                .length,
        };
    }, [ahora, data.tareas]);

    const alternarPantallaCompleta = async () => {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await document.documentElement.requestFullscreen();
            }
        } catch {
            // Algunos navegadores móviles no implementan la API. La ruta igual
            // se mantiene como una pantalla limpia que cubre todo el shell.
        }
    };

    const fechaLarga = new Intl.DateTimeFormat("es-CL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(ahora);
    const hora = new Intl.DateTimeFormat("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(ahora);

    return createPortal(
        <div
            className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 text-white"
            style={{
                paddingTop: "max(1rem, env(safe-area-inset-top))",
                paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
            }}
        >
            <div className="mx-auto w-full max-w-[3600px] px-4 sm:px-6 lg:px-8 2xl:px-10">
                <header className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between 2xl:pb-7">
                    <div>
                        <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-300 2xl:text-lg">
                            Centro de operaciones · Taller y terreno
                        </p>
                        <h1 className="mt-1 text-3xl font-black capitalize tracking-tight sm:text-4xl 2xl:text-6xl">
                            {fechaLarga}
                        </h1>
                        <div
                            className="mt-3 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-400 2xl:text-lg"
                            role="status"
                            aria-live="polite"
                        >
                            <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                    error
                                        ? "bg-rose-400"
                                        : loading || !ultimaActualizacion
                                          ? "bg-amber-400"
                                          : "bg-emerald-400"
                                }`}
                                aria-hidden="true"
                            />
                            <span>
                                {loading && ultimaActualizacion
                                    ? "Actualizando…"
                                    : error && ultimaActualizacion
                                      ? `${error.message} · ${horaActualizacion(ultimaActualizacion)}`
                                      : error
                                        ? error.message
                                      : horaActualizacion(ultimaActualizacion)}
                            </span>
                            <button
                                type="button"
                                onClick={() => void actualizarManual()}
                                disabled={loading}
                                className="min-h-[44px] rounded-xl px-3 font-black text-blue-300 hover:bg-white/10 disabled:opacity-50"
                            >
                                ↻ Actualizar
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <p className="mr-2 text-5xl font-black tabular-nums text-white 2xl:text-8xl">
                            {hora}
                        </p>
                        {document.fullscreenEnabled && (
                            <button
                                type="button"
                                onClick={() => void alternarPantallaCompleta()}
                                aria-pressed={pantallaCompleta}
                                className="min-h-[48px] rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-black hover:bg-white/10 2xl:text-base"
                            >
                                {pantallaCompleta ? "Reducir" : "Pantalla completa"}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() =>
                                setRotacionPausada((pausada) => !pausada)
                            }
                            aria-pressed={rotacionPausada}
                            className="min-h-[48px] rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-black hover:bg-white/10 2xl:text-base"
                        >
                            {rotacionPausada
                                ? "▶ Reanudar rotación"
                                : "⏸ Pausar rotación"}
                        </button>
                        <Link
                            to="/tareas"
                            className="inline-flex min-h-[48px] items-center rounded-xl bg-white px-4 text-sm font-black text-slate-950 hover:bg-blue-50 2xl:text-base"
                        >
                            Salir
                        </Link>
                    </div>
                </header>

                <div className="my-5 grid grid-cols-2 gap-3 sm:grid-cols-4 2xl:my-7 2xl:gap-5">
                    {[
                        ["Trabajos hoy", resumen.delDia.length, "text-white"],
                        ["En ejecución", resumen.ejecutando.length, "text-blue-300"],
                        ["Finalizados", resumen.finalizadas, "text-emerald-300"],
                        ["Alertas", resumen.alertas.length, "text-amber-300"],
                    ].map(([etiqueta, valor, clase]) => (
                        <div
                            key={etiqueta}
                            className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 2xl:rounded-3xl 2xl:px-6 2xl:py-5"
                        >
                            <p className={`text-3xl font-black tabular-nums 2xl:text-5xl ${clase}`}>
                                {valor}
                            </p>
                            <p className="mt-1 text-xs font-black uppercase tracking-wider text-slate-400 2xl:text-base">
                                {etiqueta}
                            </p>
                        </div>
                    ))}
                </div>

                {loading && data.tareas.length === 0 ? (
                    <div className="grid gap-4 lg:grid-cols-3">
                        {[1, 2, 3].map((item) => (
                            <Skeleton key={item} className="h-[55vh] rounded-3xl bg-white/10" />
                        ))}
                    </div>
                ) : error && data.tareas.length === 0 ? (
                    <EmptyState
                        icon="⚠️"
                        title="No se pudo cargar la planificación"
                        description={error.message}
                        action={
                            <button
                                type="button"
                                onClick={() => void actualizarManual()}
                                className="min-h-[48px] rounded-xl bg-blue-600 px-4 text-sm font-black text-white"
                            >
                                Reintentar
                            </button>
                        }
                    />
                ) : (
                    <section
                        className="grid items-start gap-4 pb-4 lg:grid-cols-3 2xl:gap-6"
                        aria-label="Resumen operativo en pantalla"
                    >
                        <ColumnaPantalla
                            titulo="🛠️ En ejecución"
                            subtitulo="Trabajos iniciados por el equipo"
                            tareas={resumen.ejecutando}
                            tono="azul"
                            vacio="No hay trabajos en ejecución"
                            pagina={pagina}
                            rotacionPausada={rotacionPausada}
                        />
                        <ColumnaPantalla
                            titulo="📅 Agenda de hoy"
                            subtitulo="Próximos trabajos con responsable"
                            tareas={resumen.programadas}
                            tono="violeta"
                            vacio="No quedan trabajos programados para hoy"
                            pagina={pagina}
                            rotacionPausada={rotacionPausada}
                        />
                        <ColumnaPantalla
                            titulo="⚠️ Requieren atención"
                            subtitulo="Atrasos, esperas o trabajos sin técnico"
                            tareas={resumen.alertas}
                            tono="alerta"
                            vacio="Sin alertas operativas"
                            pagina={pagina}
                            rotacionPausada={rotacionPausada}
                            alerta
                        />
                    </section>
                )}
            </div>
        </div>,
        document.body,
    );
}
