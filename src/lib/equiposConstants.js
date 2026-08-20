// Constantes del Inventario de Equipos.
// Portadas del proyecto original (inventario-app/src/lib/constants.js).

// Bodegas donde se realiza el levantamiento de inventario.
export const BODEGAS = ["Antillanca", "Cordillera", "Renca"];

// Estados operacionales posibles para un equipo.
export const ESTADOS = [
    "Operativo",
    "Operativo con observaciones",
    "Inoperativo",
];

// Tipos de equipo (maquinaria) disponibles en el inventario.
export const TIPOS_EQUIPO = [
    "Apilador retract",
    "Apilador pedestre",
    "Grúa horquilla eléctrica",
    "Grúa horquilla a gas",
    "Traspaleta eléctrica",
    "Order picker",
    "Carro remolque",
    "Alza hombre unipersonal",
    "Apilador retractil multidireccional",
    "Recoge pedidos horizontal",
];

// Marcas de equipos que manejamos. Si el equipo no está en la lista,
// el operador elige "Otra" y tipea la marca a mano.
export const MARCAS = ["Hyster", "Jungheinrich", "Yale"];

// Valor centinela usado en el `value` del <select> cuando el operador
// eligió "Otra" y va a tipear la marca manualmente. NO se guarda en
// la DB: al enviar se reemplaza por el texto tipeado.
export const MARCA_OTRA = "__otra__";

// Motivos posibles para un movimiento de equipo. Ampliado en Fase 2
// para incluir venta a cliente y los 3 tipos de cambio de equipo (swap).
export const MOTIVOS_MOVIMIENTO = [
    "Cambio de bodega",
    "En arriendo a cliente",
    "En préstamo a cliente",
    "Venta a cliente",
    "Devuelto de arriendo",
    "Mantención interna",
    "Retorno a cliente",
    "Cierre de mantención en bodega",
    "Devolución definitiva",
    "Asignación de batería",
    "Cambio de batería",
    "Cambio de equipo (renovación)",
    "Cambio de equipo (garantía)",
    "Cambio de equipo (fallo)",
    "Mantención externa",
    "Otro",
];

// Movimientos que deben quedar respaldados con documentación física/digital.
// Se exige al menos uno de los dos documentos: acta o guía de despacho.
export const MOTIVOS_CON_DOCUMENTOS = [
    "Cambio de bodega",
    "En arriendo a cliente",
    "En préstamo a cliente",
    "Devuelto de arriendo",
    "Mantención interna",
    "Retorno a cliente",
    "Cierre de mantención en bodega",
    "Devolución definitiva",
    "Mantención externa",
];

export function requiereDocumentosMovimiento(motivo) {
    return MOTIVOS_CON_DOCUMENTOS.includes(motivo) || esSwap(motivo);
}

// Categorías para "Cambio de equipo" (swap). El valor guardado en la BD
// es el slug (minúscula, sin tilde); el label es lo que se muestra en UI.
export const CATEGORIAS_SWAP = [
    { value: "renovacion", label: "Renovación" },
    { value: "garantia", label: "Garantía" },
    { value: "fallo", label: "Fallo postventa" },
];

// Sentinel para el filtro "En cliente" en EquiposHeader/InventarioView.
// NO se guarda en la BD — es solo un valor de UI para el filtro.
// En la BD, un equipo "en cliente" tiene `bodega = NULL` + `cliente_id IS NOT NULL`.
export const BODEGA_EN_CLIENTE = "__en_cliente__";

// Detecta si el motivo es un cambio de equipo (swap bidireccional).
export function esSwap(motivo) {
    return typeof motivo === "string" && motivo.startsWith("Cambio de equipo");
}

// Detecta si el motivo es una venta (el equipo queda marcado `vendido`).
export function esVenta(motivo) {
    return motivo === "Venta a cliente";
}

// Solo estas categorías usan las baterías eléctricas grandes y reparables
// que se controlan en el inventario separado. Las baterías de equipos a gas
// u otros equipos no eléctricos quedan fuera de este módulo.
export function usaBateriaElectrica(equipo) {
    const tipo = String(equipo?.tipo_equipo ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    // Una asociación real siempre prevalece sobre el nombre descriptivo.
    if (equipo?.bateria_asociada) return true;

    // La planilla histórica tiene muchas variantes. Primero excluimos las
    // grúas a gas, cuyos textos "SIN BATERÍA" se referían a la batería de
    // arranque desechable y no al inventario eléctrico reparable.
    if (/\bgas\b/.test(tipo)) return false;

    return [
        /retrac/,
        /apilador/,
        /grua.*elect/,
        /transpaleta/,
        /order\s*picker/,
        /recoge\s*pedido/,
        /multidireccional/,
        /trilateral/,
        /remolcador/,
        /plataforma.*(aerea|tijera|unipersonal)/,
        /alza\s*hombre/,
        /brazo\s*articulado/,
    ].some((patron) => patron.test(tipo));
}

// Mapa categoría swap → motivo final. La tile "Cambio de equipo" del
// MovimientoDialog selecciona un motivo genérico y el select de categoría
// sincroniza el motivo exacto que se guarda en la BD.
export const MOTIVO_POR_CATEGORIA_SWAP = {
    renovacion: "Cambio de equipo (renovación)",
    garantia: "Cambio de equipo (garantía)",
    fallo: "Cambio de equipo (fallo)",
};

// Tiles del picker de motivos en MovimientoDialog: botones grandes y
// touch-friendly que reemplazan al <select> de 9 opciones. Los 3 motivos
// swap se colapsan en una sola tile; la categoría se elige después.
// `motivo` es el valor real que queda seleccionado al apretar la tile.
export const MOTIVOS_TILES = [
    { motivo: "Cambio de bodega", icono: "🚚", label: "Cambio de bodega" },
    { motivo: "En arriendo a cliente", icono: "🏢", label: "Arriendo" },
    { motivo: "En préstamo a cliente", icono: "🤝", label: "Préstamo" },
    { motivo: "Devuelto de arriendo", icono: "📥", label: "Devolución" },
    { motivo: "Mantención interna", icono: "🛠️", label: "Mantención interna" },
    {
        motivo: "Retorno a cliente",
        icono: "↩️",
        label: "Devolver al cliente",
        esCierreMantencion: true,
    },
    {
        motivo: "Cierre de mantención en bodega",
        icono: "📦",
        label: "Dejar en bodega",
        esCierreMantencion: true,
    },
    {
        motivo: "Devolución definitiva",
        icono: "↩️",
        label: "Devolución definitiva",
    },
    { motivo: "Venta a cliente", icono: "💰", label: "Venta" },
    {
        motivo: "Cambio de equipo (renovación)",
        icono: "🔁",
        label: "Cambio de equipo",
        esSwapTile: true,
    },
    { motivo: "Mantención externa", icono: "🔧", label: "Mantención" },
    { motivo: "Otro", icono: "📝", label: "Otro" },
];

/**
 * Devuelve la configuración de campos según el motivo seleccionado.
 *
 *   tipo:     "bodega" | "cliente" | "swap" | "externo" | "libre" | "ninguno"
 *   requiere: lista de campos que el form debe pedir (y validar).
 *
 * Los nombres de los campos son los que el MovimientoDialog entiende
 * como keys del estado `form`.
 */
export function camposPorMotivo(motivo) {
    if (motivo === "Cambio de bodega") {
        return { tipo: "bodega", requiere: ["bodega_destino"] };
    }
    if (
        motivo === "Devuelto de arriendo" ||
        motivo === "Mantención interna" ||
        motivo === "Cierre de mantención en bodega" ||
        motivo === "Devolución definitiva"
    ) {
        return { tipo: "bodega", requiere: ["bodega_destino"] };
    }
    if (motivo === "Retorno a cliente") {
        return { tipo: "cliente_retorno", requiere: [] };
    }
    if (
        motivo === "En arriendo a cliente" ||
        motivo === "En préstamo a cliente" ||
        motivo === "Venta a cliente"
    ) {
        return { tipo: "cliente", requiere: ["cliente_id"] };
    }
    if (esSwap(motivo)) {
        return {
            tipo: "swap",
            requiere: [
                "cliente_id",
                "categoria",
                "equipo_recibe_id",
                "bodega_recibe_destino",
            ],
        };
    }
    if (motivo === "Mantención externa") {
        return { tipo: "externo", requiere: ["destino_externo"] };
    }
    if (motivo === "Otro") {
        return { tipo: "libre", requiere: ["notas"] };
    }
    return { tipo: "ninguno", requiere: [] };
}

// Etiqueta corta para mostrar en chips/badges.
export const ESTADO_CHIP = {
    Operativo: "Operativo",
    "Operativo con observaciones": "Op. c/ obs.",
    Inoperativo: "Inoperativo",
};

// Elementos faltantes predefinidos (checkboxes en el formulario).
// Se almacenan como texto separado por comas en el campo
// elementos_faltantes.
export const ELEMENTOS_FALTANTES = [
    "Cabina",
    "Batería",
    "Baliza",
    "Extintor",
    "Asiento",
    "Neumáticos",
    "Espejos",
    "Documentación",
    "Otros",
];

// Email al que se envían las fotos (referencia visual en el formulario).
export const PHOTO_EMAIL = "salinascompliance@gmail.com";

// Icono por motivo de movimiento, para el timeline del historial
// por equipo y la vista global de movimientos.
export const ICONO_POR_MOTIVO = {
    "Cambio de bodega": "🚚",
    "En arriendo a cliente": "🏢",
    "En préstamo a cliente": "🤝",
    "Venta a cliente": "💰",
    "Devuelto de arriendo": "📥",
    "Mantención interna": "🛠️",
    "Retorno a cliente": "↩️",
    "Cierre de mantención en bodega": "📦",
    "Devolución definitiva": "↩️",
    "Asignación de batería": "🔋",
    "Cambio de batería": "🔋",
    "Cambio de equipo (renovación)": "🔁",
    "Cambio de equipo (garantía)": "🔁",
    "Cambio de equipo (fallo)": "🔁",
    "Mantención externa": "🔧",
    Otro: "📝",
};

export function iconoPorMotivo(motivo) {
    return ICONO_POR_MOTIVO[motivo] ?? "📌";
}

// Mapeo de campos de la base de datos a headers en español para Excel.
export const EXCEL_HEADERS = {
    correlativo: "Correlativo",
    bodega: "Bodega",
    tipo_equipo: "Tipo de Equipo",
    numero_interno: "N° Interno",
    numero_serie: "N° Serie",
    marca: "Marca",
    modelo: "Modelo",
    ubicacion_actual: "Ubicación",
    estado_operacional: "Estado",
    horometro: "Horómetro",
    elementos_faltantes: "Elementos Faltantes",
    observaciones: "Observaciones",
    responsable: "Responsable",
    foto_enviada: "Foto Enviada",
    vendido: "Vendido",
    created_at: "Fecha Registro",
};

// Orden de columnas en el Excel (correlativo primero).
export const EXCEL_COLUMN_ORDER = [
    "correlativo",
    "bodega",
    "tipo_equipo",
    "numero_interno",
    "numero_serie",
    "marca",
    "modelo",
    "ubicacion_actual",
    "estado_operacional",
    "horometro",
    "elementos_faltantes",
    "observaciones",
    "responsable",
    "foto_enviada",
    "vendido",
    "created_at",
];
