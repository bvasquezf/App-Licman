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

export async function cargarModuloTareas() {
    if (!supabase) {
        return { tareas: [], tecnicos: [], clientes: [], equipos: [] };
    }

    const [
        tareasRespuesta,
        tecnicosRespuesta,
        clientesRespuesta,
        equiposRespuesta,
    ] =
        await Promise.all([
            withRetry(() =>
                supabase
                    .from("tareas")
                    .select(
                        "*, tareas_tecnicos(tecnico_nombre), autor:perfiles!tareas_creado_por_fkey(nombre_completo)",
                    )
                    .order("updated_at", { ascending: false })
                    .limit(2000),
            ),
            withRetry(() =>
                supabase
                    .from("mantenimiento_catalogo_tecnicos")
                    .select("nombre, especialidad, activo, perfil_id")
                    .order("nombre", { ascending: true }),
            ),
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

    const tareas = (revisarRespuesta(tareasRespuesta) ?? []).map((tarea) => ({
        ...tarea,
        tecnicos: (tarea.tareas_tecnicos ?? [])
            .map((asignacion) => asignacion.tecnico_nombre)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, "es")),
    }));

    return {
        tareas,
        tecnicos: revisarRespuesta(tecnicosRespuesta) ?? [],
        clientes: revisarRespuesta(clientesRespuesta) ?? [],
        equipos: revisarRespuesta(equiposRespuesta) ?? [],
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
        p_tecnicos: tarea.tecnicos ?? [],
        p_equipo_id: tarea.equipo_id || null,
        p_motivo_espera: tarea.motivo_espera || null,
        p_resultado: tarea.resultado || null,
    };

    const respuesta = await withRetry(() =>
        supabase.rpc("guardar_tarea", params),
    );
    return revisarRespuesta(respuesta);
}

export async function cambiarEstadoTarea(tareaId, estado, detalle = null) {
    const respuesta = await withRetry(() =>
        supabase.rpc("cambiar_estado_tarea", {
            p_tarea_id: tareaId,
            p_estado: estado,
            p_detalle: detalle || null,
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

export async function crearTecnicoTareas(nombre) {
    const limpio = String(nombre ?? "").trim();
    if (!limpio) throw new Error("Ingresa el nombre del técnico");

    const respuesta = await withRetry(() =>
        supabase
            .from("mantenimiento_catalogo_tecnicos")
            .upsert(
                { nombre: limpio, activo: true },
                { onConflict: "nombre" },
            )
            .select("nombre, especialidad, activo, perfil_id")
            .single(),
    );
    return revisarRespuesta(respuesta);
}

export async function vincularMiTecnicoTareas(nombre) {
    const limpio = String(nombre ?? "").trim();
    if (!limpio) throw new Error("Selecciona tu nombre en el catálogo");

    const respuesta = await withRetry(() =>
        supabase.rpc("vincular_mi_tecnico_tareas", {
            p_nombre: limpio,
        }),
    );
    return revisarRespuesta(respuesta);
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
    const tieneTecnico = Boolean(tarea.tecnicos?.length);
    return tieneFecha && tieneTecnico ? "Programada" : "Por programar";
}

export function estaTareaActiva(tarea) {
    return ESTADOS_TAREA_ACTIVA.includes(tarea.estado);
}

export function tecnicosDeMiPerfil(tecnicos, perfil) {
    if (!perfil?.id) return [];
    const nombrePerfil = String(perfil.nombre_completo ?? "")
        .trim()
        .toLocaleLowerCase("es");

    return tecnicos
        .filter((tecnico) => {
            if (tecnico.perfil_id) return tecnico.perfil_id === perfil.id;
            return (
                String(tecnico.nombre ?? "")
                    .trim()
                    .toLocaleLowerCase("es") === nombrePerfil
            );
        })
        .map((tecnico) => tecnico.nombre);
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
