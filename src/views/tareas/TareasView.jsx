import { useCallback, useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import TareasTablero from "../../components/tareas/TareasTablero";
import TareasCalendario from "../../components/tareas/TareasCalendario";
import CargaTecnicos from "../../components/tareas/CargaTecnicos";
import TareaCard from "../../components/tareas/TareaCard";
import TareaFormDialog from "../../components/tareas/TareaFormDialog";
import { useToast } from "../../context/ToastContext";
import { useAsync } from "../../hooks/useAsync";
import { useUrlFilters } from "../../hooks/useUrlFilters";
import {
    PRIORIDADES_TAREA,
    cambiarEstadoTarea,
    cargarModuloTareas,
    compararTareas,
    crearTecnicoTareas,
    fechaLocalISO,
    guardarTarea,
} from "../../lib/tareasData";

const VISTAS = {
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
    finalizadas: {
        titulo: "Tareas finalizadas",
        subtitulo:
            "Consulta trabajos cerrados, cancelados o reabre una tarea si vuelve a ser necesaria.",
    },
};

export default function TareasView({ vista = "tablero" }) {
    const toast = useToast();
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
    const [tareaEditar, setTareaEditar] = useState(null);
    const [cambiandoId, setCambiandoId] = useState(null);
    const [tecnicosNuevos, setTecnicosNuevos] = useState([]);

    const cargar = useCallback(() => cargarModuloTareas(), []);
    const {
        data = { tareas: [], tecnicos: [], clientes: [] },
        loading,
        error,
        refetch,
    } = useAsync(cargar, {
        errorContexto: "cargar la planificación de tareas",
        onError: (err) => toast.error(err.message),
    });

    const tecnicos = useMemo(() => {
        const porNombre = new Map();
        for (const tecnico of [...data.tecnicos, ...tecnicosNuevos]) {
            porNombre.set(tecnico.nombre, tecnico);
        }
        return [...porNombre.values()].sort((a, b) =>
            a.nombre.localeCompare(b.nombre, "es"),
        );
    }, [data.tecnicos, tecnicosNuevos]);

    const hoy = fechaLocalISO();
    const activas = data.tareas.filter((tarea) =>
        ["Pendiente", "En proceso"].includes(tarea.estado),
    );
    const estadisticas = {
        pendientes: activas.filter((tarea) => tarea.estado === "Pendiente")
            .length,
        enProceso: activas.filter((tarea) => tarea.estado === "En proceso")
            .length,
        hoy: activas.filter((tarea) => tarea.fecha_programada === hoy).length,
        sinAsignar: activas.filter((tarea) => !tarea.tecnicos?.length).length,
    };

    const tareasFiltradas = useMemo(() => {
        const texto = busqueda.trim().toLocaleLowerCase("es");
        const visibles = data.tareas.filter((tarea) => {
            const perteneceArchivo = ["Finalizada", "Cancelada"].includes(
                tarea.estado,
            );
            if (vista === "finalizadas" && !perteneceArchivo) return false;
            if (vista !== "finalizadas" && tarea.estado === "Cancelada") {
                return false;
            }
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
                    ? tarea.tecnicos?.length > 0
                    : !tarea.tecnicos?.includes(filtroTecnico))
            ) {
                return false;
            }
            if (!texto) return true;
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
            if (vista === "finalizadas") {
                return String(b.fecha_finalizada ?? b.updated_at).localeCompare(
                    String(a.fecha_finalizada ?? a.updated_at),
                );
            }
            return compararTareas(a, b);
        });
    }, [
        busqueda,
        data.tareas,
        filtroPrioridad,
        filtroTecnico,
        filtroTipo,
        vista,
    ]);

    const abrirNueva = (fecha = null) => {
        setTareaEditar(fecha ? { fecha_programada: fecha } : null);
        setModalAbierto(true);
    };

    const abrirEditar = (tarea) => {
        setTareaEditar(tarea);
        setModalAbierto(true);
    };

    const cerrarModal = () => {
        setModalAbierto(false);
        setTareaEditar(null);
    };

    const handleGuardar = async (payload) => {
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

    const handleCambiarEstado = async (tarea, estado) => {
        if (cambiandoId) return;
        setCambiandoId(tarea.id);
        try {
            await cambiarEstadoTarea(tarea.id, estado);
            toast.success(
                estado === "Finalizada"
                    ? "Tarea finalizada"
                    : `Tarea marcada como ${estado.toLowerCase()}`,
            );
            await refetch();
        } catch (err) {
            toast.error(err?.message ?? "No se pudo cambiar el estado");
        } finally {
            setCambiandoId(null);
        }
    };

    const handleCrearTecnico = async (nombre) => {
        try {
            const creado = await crearTecnicoTareas(nombre);
            setTecnicosNuevos((prev) => [
                ...prev.filter((tecnico) => tecnico.nombre !== creado.nombre),
                creado,
            ]);
            toast.success("Técnico agregado y seleccionado");
            return creado.nombre;
        } catch (err) {
            toast.error(err?.message ?? "No se pudo agregar el técnico");
            return null;
        }
    };

    const configuracion = VISTAS[vista] ?? VISTAS.tablero;
    const hayFiltros =
        busqueda ||
        filtroPrioridad !== "todas" ||
        filtroTecnico !== "todos" ||
        filtroTipo !== "todos";

    return (
        <div>
            <PageHeader
                title={configuracion.titulo}
                subtitle={configuracion.subtitulo}
                icon="📋"
                actions={
                    <button
                        type="button"
                        onClick={() => abrirNueva()}
                        className="min-h-[44px] rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] transition hover:bg-blue-700"
                    >
                        + Nueva tarea
                    </button>
                }
            />

            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Pendientes"
                    value={estadisticas.pendientes}
                    hint="por comenzar o programadas"
                    icon="🕓"
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
                    label="Programadas hoy"
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

            <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_6px_20px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-carbon-900 sm:p-4">
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
                    <select
                        value={filtroTecnico}
                        onChange={(event) => setFiltroUrl("tecnico", event.target.value)}
                        className="min-h-[44px] rounded-xl border-[1.5px] border-slate-300 bg-white px-3 text-base font-semibold text-slate-700 outline-none focus:border-blue-600 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200"
                        aria-label="Filtrar por técnico"
                    >
                        <option value="todos">Todos los técnicos</option>
                        <option value="sin_asignar">Sin asignar</option>
                        {tecnicos
                            .filter((tecnico) => tecnico.activo)
                            .map((tecnico) => (
                                <option key={tecnico.nombre} value={tecnico.nombre}>
                                    {tecnico.nombre}
                                </option>
                            ))}
                    </select>
                    <select
                        value={filtroPrioridad}
                        onChange={(event) =>
                            setFiltroUrl("prioridad", event.target.value)
                        }
                        className="min-h-[44px] rounded-xl border-[1.5px] border-slate-300 bg-white px-3 text-base font-semibold text-slate-700 outline-none focus:border-blue-600 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200"
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
                        className="min-h-[44px] rounded-xl border-[1.5px] border-slate-300 bg-white px-3 text-base font-semibold text-slate-700 outline-none focus:border-blue-600 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200"
                        aria-label="Filtrar por tipo de trabajo"
                    >
                        <option value="todos">Taller y terreno</option>
                        <option value="Taller">Solo taller</option>
                        <option value="Terreno">Solo terreno</option>
                    </select>
                </div>
                {hayFiltros && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-white/5">
                        <p className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                            {tareasFiltradas.length} resultado
                            {tareasFiltradas.length === 1 ? "" : "s"}
                        </p>
                        <button
                            type="button"
                            onClick={limpiarFiltrosUrl}
                            className="min-h-[44px] rounded-xl px-3 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
                        >
                            Limpiar filtros
                        </button>
                    </div>
                )}
            </section>

            {loading && data.tareas.length === 0 ? (
                <div className="grid gap-4 lg:grid-cols-3">
                    {[1, 2, 3].map((item) => (
                        <Skeleton key={item} className="h-80 rounded-2xl" />
                    ))}
                </div>
            ) : error && data.tareas.length === 0 ? (
                <EmptyState
                    icon="⚠️"
                    title="No se pudo cargar el módulo de tareas"
                    description={error.message}
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
            ) : vista === "calendario" ? (
                <TareasCalendario
                    tareas={tareasFiltradas}
                    onEditar={abrirEditar}
                    onCambiarEstado={handleCambiarEstado}
                    onNuevaFecha={abrirNueva}
                />
            ) : vista === "tecnicos" ? (
                <CargaTecnicos
                    tareas={tareasFiltradas}
                    tecnicos={tecnicos}
                    tecnicoFiltro={filtroTecnico}
                    onEditar={abrirEditar}
                    onCambiarEstado={handleCambiarEstado}
                    onNueva={() => abrirNueva()}
                />
            ) : vista === "finalizadas" ? (
                tareasFiltradas.length > 0 ? (
                    <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {tareasFiltradas.map((tarea) => (
                            <TareaCard
                                key={tarea.id}
                                tarea={tarea}
                                onEditar={abrirEditar}
                                onCambiarEstado={handleCambiarEstado}
                            />
                        ))}
                    </div>
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
                    onNueva={() => abrirNueva()}
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
                onClose={cerrarModal}
                onGuardar={handleGuardar}
                onCrearTecnico={handleCrearTecnico}
            />
        </div>
    );
}
