import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import TareasTablero from "../../components/tareas/TareasTablero";
import TareasCalendario from "../../components/tareas/TareasCalendario";
import CargaTecnicos from "../../components/tareas/CargaTecnicos";
import TareasSemana from "../../components/tareas/TareasSemana";
import TareasListaPaginada from "../../components/tareas/TareasListaPaginada";
import TareaFormDialog from "../../components/tareas/TareaFormDialog";
import TareaDetalleDialog from "../../components/tareas/TareaDetalleDialog";
import TareaEstadoDialog from "../../components/tareas/TareaEstadoDialog";
import AgendaHoy from "../../components/tareas/AgendaHoy";
import PorProgramar from "../../components/tareas/PorProgramar";
import MisTareas from "../../components/tareas/MisTareas";
import TareasEliminadas from "../../components/tareas/TareasEliminadas";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { useTareas } from "../../context/TareasContext";
import { useUrlFilters } from "../../hooks/useUrlFilters";
import { PERMISOS } from "../../lib/authPermissions";
import {
    PRIORIDADES_TAREA,
    cambiarEstadoTarea,
    compararTareas,
    estaTareaActiva,
    eliminarTarea,
    fechaLocalISO,
    guardarTarea,
    restaurarTarea,
} from "../../lib/tareasData";

const VISTAS = {
    agenda: {
        titulo: "Agenda de hoy",
        subtitulo:
            "Coordina la jornada, resuelve atrasos y registra las visitas que van apareciendo.",
    },
    por_programar: {
        titulo: "Por programar",
        subtitulo:
            "Ordena solicitudes nuevas y completa las que todavía no tienen fecha o técnico.",
    },
    tablero: {
        titulo: "Planificación de tareas",
        subtitulo:
            "Ordena las solicitudes de taller y terreno, asígnalas y revisa su avance.",
    },
    calendario: {
        titulo: "Calendario de trabajos",
        subtitulo:
            "Revisa la disponibilidad y reprograma las visitas según su urgencia.",
    },
    tecnicos: {
        titulo: "Carga por técnico",
        subtitulo:
            "Mira rápidamente en qué está cada técnico y quién tiene disponibilidad.",
    },
    semana: {
        titulo: "Semana de trabajos",
        subtitulo:
            "Distribuye la semana completa y detecta rápidamente espacios sin horario o responsable.",
    },
    mis_tareas: {
        titulo: "Mis tareas",
        subtitulo:
            "Vista personal para ejecutar los trabajos asignados desde el teléfono.",
    },
    finalizadas: {
        titulo: "Tareas finalizadas",
        subtitulo:
            "Consulta trabajos cerrados, cancelados o reabre una tarea si vuelve a ser necesaria.",
    },
    eliminadas: {
        titulo: "Papelera de tareas",
        subtitulo:
            "Recupera solicitudes eliminadas sin perder su planificación ni historial.",
    },
};

function formatearActualizacion(valor) {
    if (!valor) return "Esperando primera actualización";
    return `Actualizado a las ${new Intl.DateTimeFormat("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).format(valor)}`;
}

export default function TareasView({ vista = "agenda" }) {
    const toast = useToast();
    const { profile, puede } = useAuth();
    const [filtrosUrl, setFiltroUrl, limpiarFiltrosUrl] = useUrlFilters({
        q: "",
        prioridad: "todas",
        tecnico: "todos",
        tipo: "todos",
    });
    const busqueda = filtrosUrl.q;
    const filtroPrioridad = filtrosUrl.prioridad;
    const filtroTecnico = filtrosUrl.tecnico;
    const filtroTipo = filtrosUrl.tipo;
    const [modalAbierto, setModalAbierto] = useState(false);
    const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
    const [tareaEditar, setTareaEditar] = useState(null);
    const [tareaDetalle, setTareaDetalle] = useState(null);
    const [cambiandoId, setCambiandoId] = useState(null);
    const [cambioPendiente, setCambioPendiente] = useState(null);
    const {
        data,
        loading,
        operativasCargadas,
        loadingCatalogos,
        catalogosCargados,
        loadingArchivo,
        archivoCargado,
        loadingPapelera,
        papeleraCargada,
        errorOperativas,
        errorArchivo,
        errorPapelera,
        errorCatalogos,
        refetch,
        actualizarManual,
        ultimaActualizacion,
    } = useTareas();

    const tecnicos = data.tecnicos;
    const puedePlanificar = puede(PERMISOS.TAREAS_PLANIFICAR);
    const puedeEliminar = puede(PERMISOS.TAREAS_ELIMINAR);
    const puedeEjecutarPropias = puede(
        PERMISOS.TAREAS_EJECUTAR_PROPIAS,
    );

    const hoy = fechaLocalISO();
    const activas = data.tareas.filter(estaTareaActiva);
    const estadisticas = {
        porProgramar: activas.filter(
            (tarea) => tarea.estado === "Por programar",
        ).length,
        enProceso: activas.filter((tarea) => tarea.estado === "En proceso")
            .length,
        hoy: activas.filter((tarea) => tarea.fecha_programada === hoy).length,
        sinAsignar: activas.filter((tarea) => !tarea.tecnico_ids?.length)
            .length,
    };

    const tareasFiltradas = useMemo(() => {
        const texto = busqueda.trim().toLocaleLowerCase("es");
        const fuente =
            vista === "eliminadas" ? data.eliminadas : data.tareas;
        const visibles = fuente.filter((tarea) => {
            const perteneceArchivo = ["Finalizada", "Cancelada"].includes(
                tarea.estado,
            );
            if (vista !== "eliminadas") {
                if (vista === "finalizadas" && !perteneceArchivo) return false;
                if (vista !== "finalizadas" && tarea.estado === "Cancelada") {
                    return false;
                }
            }
            if (vista !== "mis_tareas") {
                if (
                    filtroPrioridad !== "todas" &&
                    tarea.prioridad !== filtroPrioridad
                ) {
                    return false;
                }
                if (filtroTipo !== "todos" && tarea.tipo !== filtroTipo) {
                    return false;
                }
                if (
                    filtroTecnico !== "todos" &&
                    (filtroTecnico === "sin_asignar"
                        ? tarea.tecnico_ids?.length > 0
                        : !tarea.tecnico_ids?.includes(filtroTecnico))
                ) {
                    return false;
                }
                if (!texto) return true;
            }
            if (vista === "mis_tareas") return true;
            return [
                tarea.titulo,
                tarea.descripcion,
                tarea.cliente_nombre,
                tarea.ubicacion,
                tarea.contacto,
                tarea.equipo_referencia,
                tarea.observaciones,
                ...(tarea.tecnicos ?? []),
            ].some((valor) =>
                String(valor ?? "")
                    .toLocaleLowerCase("es")
                    .includes(texto),
            );
        });

        return visibles.sort((a, b) => {
            if (vista === "eliminadas") {
                return String(b.eliminada_at).localeCompare(
                    String(a.eliminada_at),
                );
            }
            if (vista === "finalizadas") {
                return String(b.fecha_finalizada ?? b.updated_at).localeCompare(
                    String(a.fecha_finalizada ?? a.updated_at),
                );
            }
            return compararTareas(a, b);
        });
    }, [
        busqueda,
        data.eliminadas,
        data.tareas,
        filtroPrioridad,
        filtroTecnico,
        filtroTipo,
        vista,
    ]);

    const abrirNueva = (datos = null) => {
        if (!puedePlanificar) {
            toast.error("No tienes permisos para crear o programar tareas");
            return;
        }
        setTareaEditar(
            typeof datos === "string"
                ? { fecha_programada: datos }
                : datos
                  ? { ...datos }
                  : null,
        );
        setModalAbierto(true);
    };

    const abrirEditar = (tarea) => {
        if (!puedePlanificar) {
            setTareaDetalle(tarea);
            return;
        }
        setTareaEditar(tarea);
        setModalAbierto(true);
    };

    const cerrarModal = () => {
        setModalAbierto(false);
        setTareaEditar(null);
    };

    const handleGuardar = async (payload) => {
        if (!puedePlanificar) {
            toast.error("No tienes permisos para guardar la planificación");
            return false;
        }
        try {
            await guardarTarea(payload);
            toast.success(payload.id ? "Tarea actualizada" : "Tarea creada");
            await refetch();
            return true;
        } catch (err) {
            toast.error(err?.message ?? "No se pudo guardar la tarea");
            return false;
        }
    };

    const puedeCambiarEstadoTarea = (tarea, estado) => {
        if (puedePlanificar) return true;
        if (
            !puedeEjecutarPropias ||
            !profile?.id ||
            !tarea.tecnico_ids?.includes(profile.id)
        ) {
            return false;
        }

        return (
            (tarea.estado === "Programada" && estado === "En proceso") ||
            (tarea.estado === "En proceso" &&
                ["En espera", "Finalizada"].includes(estado)) ||
            (tarea.estado === "En espera" && estado === "En proceso")
        );
    };

    const ejecutarCambioEstado = async (tarea, estado, detalle = null) => {
        if (cambiandoId) return;
        if (!puedeCambiarEstadoTarea(tarea, estado)) {
            toast.error(
                "Solo puedes ejecutar tareas asignadas a tu propia cuenta",
            );
            return false;
        }
        setCambiandoId(tarea.id);
        try {
            await cambiarEstadoTarea(tarea.id, estado, detalle);
            const mensajes = {
                Finalizada: "Tarea finalizada con su resultado",
                "En espera": "Tarea en espera con motivo registrado",
                "En proceso": "Tarea iniciada",
                Programada: "Tarea reabierta y programada",
                "Por programar": "Tarea reabierta por programar",
            };
            toast.success(
                mensajes[estado] ??
                    `Tarea marcada como ${estado.toLowerCase()}`,
            );
            await refetch();
            return true;
        } catch (err) {
            toast.error(err?.message ?? "No se pudo cambiar el estado");
            return false;
        } finally {
            setCambiandoId(null);
        }
    };

    const handleCambiarEstado = (tarea, estado) => {
        if (!puedeCambiarEstadoTarea(tarea, estado)) {
            toast.error(
                "Solo puedes ejecutar tareas asignadas a tu propia cuenta",
            );
            return;
        }
        if (["En espera", "Finalizada"].includes(estado)) {
            setCambioPendiente({ tarea, estado });
            return;
        }
        void ejecutarCambioEstado(tarea, estado);
    };

    const handleEliminarTarea = async (tarea) => {
        if (!puedeEliminar) {
            toast.error("No tienes permisos para gestionar la papelera");
            return false;
        }
        if (
            !window.confirm(
                `¿Mover la tarea #${String(tarea.id).padStart(4, "0")} a la papelera? Podrás restaurarla después.`,
            )
        ) {
            return false;
        }

        setCambiandoId(tarea.id);
        try {
            await eliminarTarea(tarea.id);
            toast.success("Tarea movida a la papelera");
            await refetch();
            return true;
        } catch (err) {
            toast.error(err?.message ?? "No se pudo eliminar la tarea");
            return false;
        } finally {
            setCambiandoId(null);
        }
    };

    const handleRestaurarTarea = async (tarea) => {
        if (!puedeEliminar) {
            toast.error("No tienes permisos para gestionar la papelera");
            return;
        }
        setCambiandoId(tarea.id);
        try {
            await restaurarTarea(tarea.id);
            toast.success("Tarea restaurada");
            await refetch();
        } catch (err) {
            toast.error(err?.message ?? "No se pudo restaurar la tarea");
        } finally {
            setCambiandoId(null);
        }
    };

    const configuracion = VISTAS[vista] ?? VISTAS.tablero;
    const hayFiltros =
        vista !== "mis_tareas" &&
        (busqueda ||
            filtroPrioridad !== "todas" ||
            filtroTecnico !== "todos" ||
            filtroTipo !== "todos");
    const cantidadFiltrosActivos =
        Number(Boolean(busqueda)) +
        Number(filtroPrioridad !== "todas") +
        Number(filtroTecnico !== "todos") +
        Number(filtroTipo !== "todos");
    const cargandoVista =
        vista === "eliminadas"
            ? loadingPapelera
            : vista === "finalizadas"
              ? loadingArchivo
              : vista === "calendario"
                ? loading || loadingArchivo
                : vista === "tecnicos"
                  ? loading || loadingCatalogos
                  : loading;
    const errorVista =
        vista === "eliminadas"
            ? errorPapelera ?? errorOperativas
            : ["calendario", "finalizadas"].includes(vista)
              ? errorArchivo ?? errorOperativas
              : vista === "tecnicos"
                ? errorCatalogos ?? errorOperativas
                : errorOperativas;
    const recursoVistaCargado =
        vista === "eliminadas"
            ? papeleraCargada
            : vista === "finalizadas"
              ? archivoCargado
              : vista === "calendario"
                ? operativasCargadas && archivoCargado
                : vista === "tecnicos"
                  ? operativasCargadas && catalogosCargados
                  : operativasCargadas;
    const cargaInicial = !recursoVistaCargado && cargandoVista;
    const mostrarResumenGlobal = vista === "tablero" && !cargaInicial;
    const mostrarFiltros = vista !== "mis_tareas" && !cargaInicial;

    return (
        <div>
            <PageHeader
                title={configuracion.titulo}
                subtitle={configuracion.subtitulo}
                icon="📋"
                actions={
                    <>
                        {puedePlanificar && (
                            <Link
                                to="/tareas/pantalla"
                                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 dark:border-white/15 dark:bg-carbon-900 dark:text-slate-200 dark:hover:bg-white/5"
                            >
                                📺 Pantalla TV
                            </Link>
                        )}
                        {puedePlanificar && (
                            <button
                                type="button"
                                onClick={() => abrirNueva()}
                                className="min-h-[44px] rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] transition hover:bg-blue-700"
                            >
                                + Nueva solicitud
                            </button>
                        )}
                        {vista === "mis_tareas" && (
                            <button
                                type="button"
                                onClick={() => void actualizarManual()}
                                disabled={loading}
                                className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50 dark:border-white/15 dark:bg-carbon-900 dark:text-slate-200 dark:hover:bg-white/5"
                            >
                                ↻ Actualizar
                            </button>
                        )}
                    </>
                }
            />

            {mostrarResumenGlobal && (
                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Por programar"
                        value={estadisticas.porProgramar}
                        hint="sin fecha o técnico definido"
                        icon="📥"
                        tone="amber"
                    />
                    <StatCard
                        label="En proceso"
                        value={estadisticas.enProceso}
                        hint="trabajos activos ahora"
                        icon="🛠️"
                        tone="brand"
                    />
                    <StatCard
                        label="Trabajos hoy"
                        value={estadisticas.hoy}
                        hint="taller y visitas a terreno"
                        icon="📅"
                        tone="emerald"
                    />
                    <StatCard
                        label="Sin asignar"
                        value={estadisticas.sinAsignar}
                        hint="requieren definir un técnico"
                        icon="⚠️"
                        tone={estadisticas.sinAsignar > 0 ? "rose" : "emerald"}
                    />
                </div>
            )}

            {mostrarFiltros ? <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_6px_20px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-carbon-900 sm:p-4">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="relative block sm:col-span-2 lg:col-span-1">
                        <span className="sr-only">Buscar tareas</span>
                        <span
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            aria-hidden="true"
                        >
                            🔎
                        </span>
                        <input
                            type="search"
                            value={busqueda}
                            onChange={(event) => setFiltroUrl("q", event.target.value)}
                            placeholder="Buscar tarea, cliente, equipo…"
                            className="min-h-[44px] w-full rounded-xl border-[1.5px] border-slate-300 bg-white py-2.5 pl-10 pr-3 text-base text-slate-900 outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={() => setFiltrosAbiertos((abiertos) => !abiertos)}
                        className="flex min-h-[44px] items-center justify-between rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-extrabold text-slate-700 sm:hidden dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200"
                        aria-expanded={filtrosAbiertos}
                        aria-controls="filtros-tareas-avanzados"
                    >
                        <span>⚙️ Filtros</span>
                        <span className="flex items-center gap-2">
                            {cantidadFiltrosActivos > 0 && (
                                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                                    {cantidadFiltrosActivos}
                                </span>
                            )}
                            <span aria-hidden="true">
                                {filtrosAbiertos ? "▲" : "▼"}
                            </span>
                        </span>
                    </button>
                    <div
                        id="filtros-tareas-avanzados"
                        className={`${filtrosAbiertos ? "contents" : "hidden"} sm:contents`}
                    >
                        <select
                            value={filtroTecnico}
                            onChange={(event) => setFiltroUrl("tecnico", event.target.value)}
                            className="min-h-[44px] w-full min-w-0 rounded-xl border-[1.5px] border-slate-300 bg-white px-3 text-base font-semibold text-slate-700 outline-none focus:border-blue-600 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200"
                            aria-label="Filtrar por técnico"
                        >
                            <option value="todos">Todos los técnicos</option>
                            <option value="sin_asignar">Sin asignar</option>
                            {tecnicos
                                .filter((tecnico) => tecnico.activo)
                                .map((tecnico) => (
                                    <option key={tecnico.id} value={tecnico.id}>
                                        {tecnico.nombre}
                                    </option>
                                ))}
                        </select>
                        <select
                            value={filtroPrioridad}
                            onChange={(event) =>
                                setFiltroUrl("prioridad", event.target.value)
                            }
                            className="min-h-[44px] w-full min-w-0 rounded-xl border-[1.5px] border-slate-300 bg-white px-3 text-base font-semibold text-slate-700 outline-none focus:border-blue-600 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200"
                            aria-label="Filtrar por prioridad"
                        >
                            <option value="todas">Todas las prioridades</option>
                            {PRIORIDADES_TAREA.map((prioridad) => (
                                <option key={prioridad} value={prioridad}>
                                    {prioridad}
                                </option>
                            ))}
                        </select>
                        <select
                            value={filtroTipo}
                            onChange={(event) => setFiltroUrl("tipo", event.target.value)}
                            className="min-h-[44px] w-full min-w-0 rounded-xl border-[1.5px] border-slate-300 bg-white px-3 text-base font-semibold text-slate-700 outline-none focus:border-blue-600 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200"
                            aria-label="Filtrar por tipo de trabajo"
                        >
                            <option value="todos">Taller y terreno</option>
                            <option value="Taller">Solo taller</option>
                            <option value="Terreno">Solo terreno</option>
                        </select>
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-white/5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500 dark:text-neutral-400">
                        <span
                            className={`h-2 w-2 rounded-full ${
                                errorVista
                                    ? "bg-rose-500"
                                    : cargandoVista || !ultimaActualizacion
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                            }`}
                            aria-hidden="true"
                        />
                        <span role="status" aria-live="polite">
                            {cargandoVista && ultimaActualizacion
                                ? "Actualizando planificación…"
                                : errorVista && ultimaActualizacion
                                  ? `${errorVista.message} · datos de ${formatearActualizacion(ultimaActualizacion).toLowerCase()}`
                                  : errorVista
                                    ? errorVista.message
                                    : formatearActualizacion(ultimaActualizacion)}
                        </span>
                        {hayFiltros && (
                            <span>
                                {tareasFiltradas.length} resultado
                                {tareasFiltradas.length === 1 ? "" : "s"}
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                        {hayFiltros && (
                            <button
                                type="button"
                                onClick={limpiarFiltrosUrl}
                                className="min-h-[44px] rounded-xl px-3 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
                            >
                                Limpiar filtros
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => void actualizarManual()}
                            disabled={cargandoVista}
                            className="min-h-[44px] rounded-xl px-3 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:cursor-wait disabled:opacity-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
                        >
                            ↻ Actualizar
                        </button>
                    </div>
                </div>
            </section> : vista === "mis_tareas" && !cargaInicial ? (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-carbon-900 dark:text-neutral-400">
                    <span role="status" aria-live="polite">
                        {cargandoVista && ultimaActualizacion
                            ? "Actualizando tus tareas…"
                            : errorVista && ultimaActualizacion
                              ? `${errorVista.message} · datos de ${formatearActualizacion(ultimaActualizacion).toLowerCase()}`
                              : errorVista
                                ? errorVista.message
                                : formatearActualizacion(ultimaActualizacion)}
                    </span>
                    <span>Toca una tarjeta para revisar el trabajo y ejecutar su siguiente paso.</span>
                </div>
            ) : null}

            {cargaInicial ? (
                <section
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_6px_20px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-carbon-900 sm:p-5"
                    aria-busy="true"
                    aria-label="Cargando planificación"
                >
                    <div className="mb-4 flex items-center gap-3">
                        <span className="h-3 w-3 animate-pulse rounded-full bg-blue-600" />
                        <div>
                            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                                Cargando planificación…
                            </p>
                            <p className="text-xs text-slate-500 dark:text-neutral-400">
                                Preparando la información de esta vista.
                            </p>
                        </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {[1, 2, 3].map((item) => (
                            <Skeleton key={item} className="h-40 rounded-2xl" />
                        ))}
                    </div>
                </section>
            ) : errorVista && !recursoVistaCargado ? (
                <EmptyState
                    icon="⚠️"
                    title="No se pudo cargar el módulo de tareas"
                    description={errorVista.message}
                    action={
                        <button
                            type="button"
                            onClick={() => refetch()}
                            className="min-h-[44px] rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
                        >
                            Reintentar
                        </button>
                    }
                />
            ) : vista === "agenda" ? (
                <AgendaHoy
                    tareas={tareasFiltradas}
                    onEditar={abrirEditar}
                    onCambiarEstado={handleCambiarEstado}
                    onNueva={puedePlanificar ? abrirNueva : null}
                />
            ) : vista === "por_programar" ? (
                <PorProgramar
                    tareas={tareasFiltradas}
                    onEditar={abrirEditar}
                    onCambiarEstado={handleCambiarEstado}
                    onNueva={puedePlanificar ? () => abrirNueva() : null}
                />
            ) : vista === "calendario" ? (
                <TareasCalendario
                    tareas={tareasFiltradas}
                    onEditar={abrirEditar}
                    onCambiarEstado={handleCambiarEstado}
                    onNuevaFecha={puedePlanificar ? abrirNueva : null}
                />
            ) : vista === "tecnicos" ? (
                <div className="space-y-4">
                    <section className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-500/25 dark:bg-blue-500/5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-sm font-extrabold text-blue-950 dark:text-blue-200">
                                Los técnicos se administran desde Usuarios
                            </h2>
                            <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
                                Invita una cuenta o asígnale el rol Técnico. Al
                                activarla aparecerá automáticamente en esta
                                carga y en el formulario de tareas.
                            </p>
                        </div>
                        {puede(PERMISOS.USUARIOS) && (
                            <Link
                                to="/usuarios"
                                className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white hover:bg-blue-700"
                            >
                                Administrar usuarios
                            </Link>
                        )}
                    </section>
                    <CargaTecnicos
                        tareas={tareasFiltradas}
                        tecnicos={tecnicos}
                        tecnicoFiltro={filtroTecnico}
                        onEditar={abrirEditar}
                        onCambiarEstado={handleCambiarEstado}
                        onNueva={puedePlanificar ? () => abrirNueva() : null}
                    />
                </div>
            ) : vista === "semana" ? (
                <TareasSemana
                    tareas={tareasFiltradas}
                    onEditar={abrirEditar}
                    onCambiarEstado={handleCambiarEstado}
                    onNueva={puedePlanificar ? abrirNueva : null}
                />
            ) : vista === "mis_tareas" ? (
                <MisTareas
                    tareas={tareasFiltradas}
                    perfil={profile}
                    onEditar={abrirEditar}
                    onCambiarEstado={handleCambiarEstado}
                />
            ) : vista === "eliminadas" ? (
                <TareasEliminadas
                    tareas={tareasFiltradas}
                    onRestaurar={handleRestaurarTarea}
                />
            ) : vista === "finalizadas" ? (
                tareasFiltradas.length > 0 ? (
                    <TareasListaPaginada
                        tareas={tareasFiltradas}
                        onEditar={abrirEditar}
                        onCambiarEstado={handleCambiarEstado}
                        limiteInicial={18}
                        incremento={18}
                        className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3"
                    />
                ) : (
                    <EmptyState
                        icon="✅"
                        title="Sin tareas finalizadas"
                        description="Cuando cierres trabajos aparecerán aquí para futuras consultas."
                    />
                )
            ) : (
                <TareasTablero
                    tareas={tareasFiltradas}
                    onEditar={abrirEditar}
                    onCambiarEstado={handleCambiarEstado}
                    onNueva={puedePlanificar ? () => abrirNueva() : null}
                />
            )}

            {cambiandoId && (
                <p className="mt-3 text-center text-xs font-semibold text-slate-500 dark:text-neutral-400">
                    Actualizando tarea #{String(cambiandoId).padStart(4, "0")}…
                </p>
            )}

            <TareaFormDialog
                open={modalAbierto}
                tarea={tareaEditar}
                tareas={data.tareas}
                tecnicos={tecnicos}
                clientes={data.clientes}
                equipos={data.equipos}
                onClose={cerrarModal}
                onGuardar={handleGuardar}
                onEliminar={handleEliminarTarea}
                puedeEliminar={puedeEliminar}
            />

            <TareaDetalleDialog
                open={Boolean(tareaDetalle)}
                tarea={tareaDetalle}
                onClose={() => setTareaDetalle(null)}
            />

            <TareaEstadoDialog
                open={Boolean(cambioPendiente)}
                tarea={cambioPendiente?.tarea ?? null}
                estado={cambioPendiente?.estado ?? null}
                onClose={() => setCambioPendiente(null)}
                onConfirmar={(detalle) =>
                    ejecutarCambioEstado(
                        cambioPendiente.tarea,
                        cambioPendiente.estado,
                        detalle,
                    )
                }
            />
        </div>
    );
}
