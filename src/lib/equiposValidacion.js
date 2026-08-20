// Validación del formulario de Equipos.
// Portada del proyecto original (inventario-app/src/lib/validacion.js).

import {
    BODEGAS,
    ESTADOS,
    MARCA_OTRA,
    MARCAS,
    TIPOS_EQUIPO,
} from "./equiposConstants";

// Campos obligatorios para registrar un equipo.
const CAMPOS_REQUERIDOS = [
    "bodega",
    "tipo_equipo",
    "numero_interno",
    "numero_serie",
    "marca",
    "modelo",
    "estado_operacional",
    "responsable",
];

export function equipoVacio() {
    return {
        bodega: "",
        tipo_equipo: "",
        numero_interno: "",
        numero_serie: "",
        marca: "",
        marcaOtra: "",
        modelo: "",
        ubicacion_actual: "",
        estado_operacional: "",
        horometro: "",
        elementos_faltantes: [],
        observaciones: "",
        responsable: "",
        foto_enviada: false,
    };
}

/**
 * Valida un equipo.
 * @returns {{ ok: boolean, errores: string[], erroresPorCampo: Object }}
 */
export function validarEquipo(data) {
    const errores = [];
    const erroresPorCampo = {};
    const agregarError = (campo, mensaje) => {
        errores.push(mensaje);
        if (!erroresPorCampo[campo]) erroresPorCampo[campo] = mensaje;
    };

    // Campos requeridos vacíos
    for (const campo of CAMPOS_REQUERIDOS) {
        const v = data[campo];
        if (v === undefined || v === null || String(v).trim() === "") {
            agregarError(
                campo,
                `El campo "${campo.replaceAll("_", " ")}" es obligatorio.`,
            );
        }
    }

    // Bodega válida
    if (data.bodega && !BODEGAS.includes(data.bodega)) {
        agregarError("bodega", `Bodega inválida: "${data.bodega}".`);
    }

    // Tipo de equipo válido
    if (data.tipo_equipo && !TIPOS_EQUIPO.includes(data.tipo_equipo)) {
        agregarError(
            "tipo_equipo",
            `Tipo de equipo inválido: "${data.tipo_equipo}".`,
        );
    }

    // Estado operacional válido
    if (data.estado_operacional && !ESTADOS.includes(data.estado_operacional)) {
        agregarError(
            "estado_operacional",
            `Estado operacional inválido: "${data.estado_operacional}".`,
        );
    }

    // Marca: si eligió "Otra" debe haber escrito marcaOtra
    if (data.marca === MARCA_OTRA) {
        if (
            !data.marcaOtra ||
            String(data.marcaOtra).trim() === ""
        ) {
            agregarError(
                "marcaOtra",
                'Elegiste "Otra" como marca. Escribe la marca en el campo de texto.',
            );
        }
    } else if (data.marca && !MARCAS.includes(data.marca)) {
        agregarError("marca", `Marca inválida: "${data.marca}".`);
    }

    // Horómetro: si viene, debe ser número ≥ 0
    if (
        data.horometro !== undefined &&
        data.horometro !== "" &&
        data.horometro !== null
    ) {
        const n = Number(data.horometro);
        if (Number.isNaN(n) || n < 0) {
            agregarError(
                "horometro",
                "Horómetro debe ser un número mayor o igual a 0.",
            );
        }
    }

    return { ok: errores.length === 0, errores, erroresPorCampo };
}
