export const PROPIEDADES_EQUIPO = [
    {
        valor: "Licman",
        etiqueta: "Equipo Licman",
        descripcion: "Seleccionar desde el inventario de equipos.",
        icono: "🏗️",
    },
    {
        valor: "Cliente",
        etiqueta: "Equipo del cliente",
        descripcion: "Registrar sus datos sin incorporarlo al inventario propio.",
        icono: "🤝",
    },
    {
        valor: "Por confirmar",
        etiqueta: "Por confirmar",
        descripcion: "Todavía no sabemos qué equipo está involucrado.",
        icono: "❓",
    },
    {
        valor: "Sin equipo",
        etiqueta: "Sin equipo",
        descripcion: "El requerimiento no corresponde a un equipo específico.",
        icono: "📋",
    },
];

export function propiedadEquipoTarea(tarea = {}) {
    const registro = tarea ?? {};
    const encontrada = PROPIEDADES_EQUIPO.find(
        (opcion) => opcion.valor === registro.propiedad_equipo,
    );
    if (encontrada) return encontrada;
    if (registro.equipo_id) return PROPIEDADES_EQUIPO[0];
    if (registro.equipo_cliente_tipo) return PROPIEDADES_EQUIPO[1];
    return PROPIEDADES_EQUIPO[2];
}

export function referenciaEquipoCliente(tarea = {}) {
    const registro = tarea ?? {};
    return [
        registro.equipo_cliente_tipo,
        [registro.equipo_cliente_marca, registro.equipo_cliente_modelo]
            .filter(Boolean)
            .join(" "),
        registro.equipo_cliente_serie
            ? `Serie ${registro.equipo_cliente_serie}`
            : null,
    ]
        .filter(Boolean)
        .join(" · ");
}

export function resumenEquipoTarea(tarea = {}) {
    const registro = tarea ?? {};
    const propiedad = propiedadEquipoTarea(registro);
    if (propiedad.valor === "Licman") {
        return registro.equipo_referencia || "Equipo Licman sin referencia";
    }
    if (propiedad.valor === "Cliente") {
        return referenciaEquipoCliente(registro) || "Equipo del cliente";
    }
    return propiedad.etiqueta;
}

export function equipoIdentificado(tarea = {}) {
    return propiedadEquipoTarea(tarea).valor !== "Por confirmar";
}
