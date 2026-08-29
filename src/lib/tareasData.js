import { supabase } from "../services/supabase";
import { withRetry } from "../utils/withRetry";

export const ESTADOS_TAREA = [
    "Por programar",
    "Programada",
    "En proceso",
    "En espera",
    "Finalizada",
    "Cancelada",
];

export const ESTADOS_TAREA_ACTIVA = [
    "Por programar",
    "Programada",
    "En proceso",
    "En espera",
];

export const PRIORIDADES_TAREA = ["Baja", "Normal", "Alta", "Urgente"];
export const TIPOS_TAREA = ["Taller", "Terreno"];

export const PRIORIDAD_PESO = {
    Urgente: 4,
    Alta: 3,
    Normal: 2,
    Baja: 1,
};

export const ESTADO_PESO = {
    "En proceso": 1,
    "En espera": 2,
    Programada: 3,
    "Por programar": 4,
    Finalizada: 5,
    Cancelada: 6,
};

function revisarRespuesta(respuesta) {
    if (respuesta.error) throw respuesta.error;
    return respuesta.data;
}

const SELECT_TAREA =
    "*, tareas_tecnicos(tecnico_id, tecnico_nombre, tecnico:perfiles!tareas_tecnicos_tecnico_id_fkey(id, nombre_completo, cargo, activo, rol:roles_app!perfiles_rol_id_fkey(codigo))), autor:perfiles!tareas_creado_por_fkey(nombre_completo)";

function normalizarTarea(tarea) {
    const asignacionesTecnicos = (tarea.tareas_tecnicos ?? [])
        .map((asignacion) => {
            const activo = Boolean(
                asignacion.tecnico?.activo &&
                    asignacion.tecnico?.rol?.codigo === "tecnico",
            );
            return {
                id: asignacion.tecnico_id ?? null,
                nombre:
                    asignacion.tecnico?.nombre_completo ??
                    asignacion.tecnico_nombre,
                activo,
                cargo: asignacion.tecnico?.cargo ?? null,
                esLegado: !asignacion.tecnico_id,
            };
        })
        .filter((asignacion) => asignacion.nombre)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    return {
        ...tarea,
        asignaciones_tecnicos: asignacionesTecnicos,
        tecnico_ids: asignacionesTecnicos
            .filter((asignacion) => asignacion.activo)
            .map((asignacion) => asignacion.id)
            .filter(Boolean),
        tecnicos: asignacionesTecnicos.map(
            (asignacion) => asignacion.nombre,
        ),
    };
}

function datosVaciosTareas() {
    return {
        tareas: [],
        eliminadas: [],
        tecnicos: [],
        clientes: [],
        equipos: [],
    };
}

export async function cargarTareasOperativas() {
    if (!supabase) {
        return { tareas: [] };
    }

    const [activasRespuesta, finalizadasHoyRespuesta] = await Promise.all([
        withRetry(() =>
            supabase
                .from("tareas")
                .select(SELECT_TAREA)
                .is("eliminada_at", null)
                .in("estado", ESTADOS_TAREA_ACTIVA)
                .order("updated_at", { ascending: false })
                .limit(2000),
        ),
        withRetry(() =>
            supabase
                .from("tareas")
                .select(SELECT_TAREA)
                .is("eliminada_at", null)
                .eq("estado", "Finalizada")
                .eq("fecha_programada", fechaLocalISO())
                .order("updated_at", { ascending: false })
                .limit(200),
        ),
    ]);

    const tareas = [
        ...(revisarRespuesta(activasRespuesta) ?? []),
        ...(revisarRespuesta(finalizadasHoyRespuesta) ?? []),
    ].map(normalizarTarea);
    return { tareas };
}

export async function cargarArchivoTareas() {
    if (!supabase) return [];
    const respuesta = await withRetry(() =>
        supabase
            .from("tareas")
            .select(SELECT_TAREA)
            .is("eliminada_at", null)
            .in("estado", ["Finalizada", "Cancelada"])
            .order("fecha_finalizada", { ascending: false, nullsFirst: false })
            .order("updated_at", { ascending: false })
            .limit(1000),
    );
    return (revisarRespuesta(respuesta) ?? []).map(normalizarTarea);
}

export async function cargarCatalogosTareas() {
    if (!supabase) return { tecnicos: [], clientes: [], equipos: [] };
    const [tecnicosRespuesta, clientesRespuesta, equiposRespuesta] =
        await Promise.all([
            withRetry(() => supabase.rpc("listar_tecnicos_tareas")),
            withRetry(() =>
                supabase
                    .from("clientes")
                    .select(
                        "id, razon_social, contacto, celular, direccion, comuna, activo",
                    )
                    .eq("activo", true)
                    .order("razon_social", { ascending: true }),
            ),
            withRetry(() => supabase.rpc("listar_equipos_para_tareas")),
        ]);
    return {
        tecnicos: revisarRespuesta(tecnicosRespuesta) ?? [],
        clientes: revisarRespuesta(clientesRespuesta) ?? [],
        equipos: revisarRespuesta(equiposRespuesta) ?? [],
    };
}

export async function cargarPapeleraTareas() {
    if (!supabase) return [];
    const respuesta = await withRetry(() =>
        supabase
            .from("tareas")
            .select(
                `${SELECT_TAREA}, eliminador:perfiles!tareas_eliminada_por_fkey(nombre_completo)`,
            )
            .not("eliminada_at", "is", null)
            .order("eliminada_at", { ascending: false })
            .limit(500),
    );
    return (revisarRespuesta(respuesta) ?? []).map(normalizarTarea);
}

export async function cargarModuloTareas({ incluirEliminadas = true } = {}) {
    const vacios = datosVaciosTareas();
    const [operativas, catalogos, archivo, eliminadas] = await Promise.all([
        cargarTareasOperativas(),
        cargarCatalogosTareas(),
        cargarArchivoTareas(),
        incluirEliminadas ? cargarPapeleraTareas() : Promise.resolve([]),
    ]);
    const porId = new Map(
        [...operativas.tareas, ...archivo].map((tarea) => [tarea.id, tarea]),
    );
    return {
        ...vacios,
        ...operativas,
        ...catalogos,
        tareas: [...porId.values()],
        eliminadas,
    };
}

export async function guardarTarea(tarea) {
    const params = {
        p_tarea_id: tarea.id ?? null,
        p_titulo: tarea.titulo,
        p_descripcion: tarea.descripcion || null,
        p_tipo: tarea.tipo,
        p_estado: tarea.estado,
        p_prioridad: tarea.prioridad,
        p_fecha_programada: tarea.fecha_programada || null,
        p_hora_inicio: tarea.hora_inicio || null,
        p_hora_fin: tarea.hora_fin || null,
        p_cliente_id: tarea.cliente_id || null,
        p_cliente_nombre: tarea.cliente_nombre || null,
        p_ubicacion: tarea.ubicacion || null,
        p_contacto: tarea.contacto || null,
        p_equipo_referencia: tarea.equipo_referencia || null,
        p_observaciones: tarea.observaciones || null,
        p_tecnico_ids: tarea.tecnico_ids ?? [],
        p_equipo_id: tarea.equipo_id || null,
        p_motivo_espera: tarea.motivo_espera || null,
        p_resultado: tarea.resultado || null,
    };

    const respuesta = await withRetry(() =>
        supabase.rpc("guardar_tarea_usuarios", params),
    );
    return revisarRespuesta(respuesta);
}

export async function cambiarEstadoTarea(tareaId, estado, detalle = null) {
    const respuesta = await withRetry(() =>
        supabase.rpc("cambiar_estado_tarea_usuarios", {
            p_tarea_id: tareaId,
            p_estado: estado,
            p_detalle: detalle || null,
        }),
    );
    return revisarRespuesta(respuesta);
}

export async function eliminarTarea(tareaId, motivo = null) {
    const respuesta = await withRetry(() =>
        supabase.rpc("eliminar_tarea", {
            p_tarea_id: tareaId,
            p_motivo: motivo || null,
        }),
    );
    return revisarRespuesta(respuesta);
}

export async function restaurarTarea(tareaId) {
    const respuesta = await withRetry(() =>
        supabase.rpc("restaurar_tarea", {
            p_tarea_id: tareaId,
        }),
    );
    return revisarRespuesta(respuesta);
}

export async function cargarHistorialTarea(tareaId) {
    if (!tareaId || !supabase) return [];
    const respuesta = await withRetry(() =>
        supabase
            .from("tareas_historial")
            .select(
                "id, evento, valor_anterior, valor_nuevo, detalle, created_at, autor:perfiles!tareas_historial_creado_por_fkey(nombre_completo)",
            )
            .eq("tarea_id", tareaId)
            .order("created_at", { ascending: false })
            .limit(80),
    );
    return revisarRespuesta(respuesta) ?? [];
}

export function fechaLocalISO(fecha = new Date()) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
}

export function parseFechaLocal(fecha) {
    if (!fecha) return null;
    const [anio, mes, dia] = String(fecha).split("-").map(Number);
    if (!anio || !mes || !dia) return null;
    return new Date(anio, mes - 1, dia);
}

export function formatearFechaTarea(fecha, opciones = {}) {
    const valor = parseFechaLocal(fecha);
    if (!valor) return "Sin fecha";
    return new Intl.DateTimeFormat("es-CL", {
        day: "numeric",
        month: "short",
        year: opciones.sinAnio ? undefined : "numeric",
        ...opciones,
    }).format(valor);
}

export function duracionTareaMinutos(tarea) {
    if (!tarea?.hora_inicio || !tarea?.hora_fin) return null;
    const [horaInicio, minutoInicio] = String(tarea.hora_inicio)
        .slice(0, 5)
        .split(":")
        .map(Number);
    const [horaFin, minutoFin] = String(tarea.hora_fin)
        .slice(0, 5)
        .split(":")
        .map(Number);
    if (
        !Number.isFinite(horaInicio) ||
        !Number.isFinite(minutoInicio) ||
        !Number.isFinite(horaFin) ||
        !Number.isFinite(minutoFin) ||
        horaInicio < 0 ||
        horaInicio > 23 ||
        horaFin < 0 ||
        horaFin > 23 ||
        minutoInicio < 0 ||
        minutoInicio > 59 ||
        minutoFin < 0 ||
        minutoFin > 59
    ) {
        return null;
    }
    const minutos = horaFin * 60 + minutoFin - (horaInicio * 60 + minutoInicio);
    return minutos > 0 ? minutos : null;
}

export function formatearDuracionMinutos(minutos) {
    if (!Number.isFinite(minutos) || minutos <= 0) return "Sin horario";
    const horas = Math.floor(minutos / 60);
    const restantes = minutos % 60;
    if (horas === 0) return `${restantes} min`;
    if (restantes === 0) return `${horas} h`;
    return `${horas} h ${restantes} min`;
}

export function compararTareas(a, b) {
    const fechaA = a.fecha_programada || "9999-12-31";
    const fechaB = b.fecha_programada || "9999-12-31";
    if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);
    const horaA = a.hora_inicio || "99:99";
    const horaB = b.hora_inicio || "99:99";
    if (horaA !== horaB) return horaA.localeCompare(horaB);
    const prioridad =
        (PRIORIDAD_PESO[b.prioridad] ?? 0) -
        (PRIORIDAD_PESO[a.prioridad] ?? 0);
    if (prioridad !== 0) return prioridad;
    return (b.id ?? 0) - (a.id ?? 0);
}

export function estadoSegunPlanificacion(tarea) {
    const tieneFecha = Boolean(tarea.fecha_programada);
    const tieneTecnico = Boolean(tarea.tecnico_ids?.length);
    return tieneFecha && tieneTecnico ? "Programada" : "Por programar";
}

export function estaTareaActiva(tarea) {
    return ESTADOS_TAREA_ACTIVA.includes(tarea.estado);
}

export function tareasSeSolapan(a, b) {
    if (!a.fecha_programada || a.fecha_programada !== b.fecha_programada) {
        return false;
    }
    if (!a.hora_inicio || !b.hora_inicio) return true;

    const inicioA = String(a.hora_inicio).slice(0, 5);
    const finA = a.hora_fin ? String(a.hora_fin).slice(0, 5) : inicioA;
    const inicioB = String(b.hora_inicio).slice(0, 5);
    const finB = b.hora_fin ? String(b.hora_fin).slice(0, 5) : inicioB;

    if (finA === inicioA || finB === inicioB) return inicioA === inicioB;
    return inicioA < finB && inicioB < finA;
}
