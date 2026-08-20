/**
 * Normaliza los elementos faltantes almacenados como arreglo o texto CSV.
 * Los guiones y textos usados históricamente como marcadores vacíos no
 * representan un faltante real y, por lo tanto, se descartan.
 */
export function parseFaltantes(valor) {
    if (!valor) return [];

    const items = Array.isArray(valor) ? valor : String(valor).split(",");
    const marcadoresVacios = new Set([
        "-",
        "—",
        "n/a",
        "no aplica",
        "ninguno",
        "ninguna",
        "sin faltantes",
    ]);

    const normalizados = items
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
        .filter(
            (item) =>
                !marcadoresVacios.has(item.toLocaleLowerCase("es-CL")),
        );

    return [...new Set(normalizados)];
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
