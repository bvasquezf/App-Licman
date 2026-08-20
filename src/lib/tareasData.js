import { supabase } from "../services/supabase";
import { withRetry } from "../utils/withRetry";

export const ESTADOS_TAREA = [
    "Pendiente",
    "En proceso",
    "Finalizada",
    "Cancelada",
];

export const PRIORIDADES_TAREA = ["Baja", "Normal", "Alta", "Urgente"];
export const TIPOS_TAREA = ["Taller", "Terreno"];

export const PRIORIDAD_PESO = {
    Urgente: 4,
    Alta: 3,
    Normal: 2,
    Baja: 1,
};

function revisarRespuesta(respuesta) {
    if (respuesta.error) throw respuesta.error;
    return respuesta.data;
}

export async function cargarModuloTareas() {
    if (!supabase) return { tareas: [], tecnicos: [], clientes: [] };

    const [tareasRespuesta, tecnicosRespuesta, clientesRespuesta] =
        await Promise.all([
            withRetry(() =>
                supabase
                    .from("tareas")
                    .select("*, tareas_tecnicos(tecnico_nombre), autor:perfiles!tareas_creado_por_fkey(nombre_completo)")
                    .order("updated_at", { ascending: false })
                    .limit(2000),
            ),
            withRetry(() =>
                supabase
                    .from("mantenimiento_catalogo_tecnicos")
                    .select("nombre, especialidad, activo")
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
    };

    const respuesta = await withRetry(() =>
        supabase.rpc("guardar_tarea", params),
    );
    return revisarRespuesta(respuesta);
}

export async function cambiarEstadoTarea(tareaId, estado) {
    const respuesta = await withRetry(() =>
        supabase.rpc("cambiar_estado_tarea", {
            p_tarea_id: tareaId,
            p_estado: estado,
        }),
    );
    return revisarRespuesta(respuesta);
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
            .select("nombre, especialidad, activo")
            .single(),
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
    const prioridad =
        (PRIORIDAD_PESO[b.prioridad] ?? 0) -
        (PRIORIDAD_PESO[a.prioridad] ?? 0);
    if (prioridad !== 0) return prioridad;
    return (b.id ?? 0) - (a.id ?? 0);
}
