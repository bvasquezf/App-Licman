/**
 * Normaliza los elementos faltantes almacenados como arreglo o texto CSV.
 */
export function parseFaltantes(valor) {
    if (!valor) return [];
    if (Array.isArray(valor)) return valor.filter(Boolean);
    return String(valor)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

/**
 * Presenta la capacidad del equipo con formato chileno y unidad.
 */
export function formatearCapacidad(valor) {
    if (valor === null || valor === undefined || valor === "") return "—";
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return String(valor);
    return `${new Intl.NumberFormat("es-CL", {
        maximumFractionDigits: 2,
    }).format(numero)} kg`;
}

/**
 * Evita mostrar valores vacíos o nulos en las fichas de equipos.
 */
export function mostrarDato(valor) {
    return valor === null || valor === undefined || String(valor).trim() === ""
        ? "—"
        : String(valor);
}
