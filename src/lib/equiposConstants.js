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
    "Venta a cliente",
    "Devuelto de arriendo",
    "Cambio de equipo (renovación)",
    "Cambio de equipo (garantía)",
    "Cambio de equipo (fallo)",
    "Mantención externa",
    "Otro",
];

// Categorías para "Cambio de equipo" (swap). El valor guardado en la BD
// es el slug (minúscula, sin tilde); el label es lo que se muestra en UI.
export const CATEGORIAS_SWAP = [
    { value: "renovacion", label: "Renovación" },
    { value: "garantia", label: "Garantía" },
    { value: "fallo", label: "Fallo postventa" },
];

// Sentinel para el filtro "En cliente" en EquiposHeader/ListView.
// NO se guarda en la BD — es solo un valor de UI para el filtro.
// En la BD, un equipo "en cliente" tiene `bodega = NULL` + `cliente_id IS NOT NULL`.
export const BODEGA_EN_CLIENTE = "__en_cliente__";

// Detecta si el motivo es un cambio de equipo (swap bidireccional).
export function esSwap(motivo) {
    return typeof motivo === "string" && motivo.startsWith("Cambio de equipo");
}

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
    if (motivo === "Devuelto de arriendo") {
        return { tipo: "bodega", requiere: ["bodega_destino"] };
    }
    if (motivo === "En arriendo a cliente" || motivo === "Venta a cliente") {
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
    "created_at",
];