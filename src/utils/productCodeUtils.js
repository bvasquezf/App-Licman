// Utilidades para detectar categoría y generar código automático de productos
// a partir del nombre, basándose en palabras clave comunes de una bodega/ferretería.

// ─── Mapeo principal ──────────────────────────────────────────────
// Cada entrada: { prefijo, categoria, palabras: [] }
// La PRIMERA coincidencia (en el orden definido) gana.
// Algunas palabras llevan un espacio al final a propósito para evitar
// falsos positivos por substring (ej: "led " vs "leds", "tee " vs "street").
const PALABRAS_CLAVE = [
    {
        prefijo: "PER",
        categoria: "Pernos",
        palabras: ["perno", "bulon", "prisionero", "esparrago", "hexagonal"],
    },
    {
        prefijo: "TOR",
        categoria: "Tornillos",
        palabras: ["tornillo", "tirafondo", "allen", "drywall", "phillips"],
    },
    {
        prefijo: "TUE",
        categoria: "Tuercas",
        palabras: ["tuerca", "mariposa", "locknut"],
    },
    {
        prefijo: "GOL",
        categoria: "Golillas y arandelas",
        palabras: ["golilla", "arandela", "washer"],
    },
    {
        prefijo: "CLA",
        categoria: "Clavos",
        palabras: ["clavo", "puntilla", "tachuela"],
    },
    {
        prefijo: "TAR",
        categoria: "Tarugos y tacos",
        palabras: ["tarugo", "taco ", "taco de", "expansion"],
    },
    {
        prefijo: "CAB",
        categoria: "Cables y conductores",
        palabras: ["cable", "alambre", "cordon", "extension", "manguera"],
    },
    {
        prefijo: "ELE",
        categoria: "Eléctrico",
        palabras: [
            "enchufe",
            "interruptor",
            "breaker",
            "termica",
            "diferencial",
            "soquet",
            "socket",
        ],
    },
    {
        prefijo: "ILU",
        categoria: "Iluminación",
        palabras: ["lampara", "ampolleta", "led ", "tubo fluorescente", "plafon"],
    },
    {
        prefijo: "PIN",
        categoria: "Pinturas y químicos",
        palabras: [
            "pintura",
            "brocha",
            "rodillo",
            "esmalte",
            "anticorrosivo",
            "laca",
            "diluyente",
            "thinner",
            "lija",
            "masilla",
        ],
    },
    {
        prefijo: "ADH",
        categoria: "Adhesivos y sellos",
        palabras: [
            "silicona",
            "adhesivo",
            "pegamento",
            "cinta aisladora",
            "teflon",
            "sellador",
            "epoxy",
            "cola",
        ],
    },
    {
        prefijo: "HERP",
        categoria: "Herramientas eléctricas",
        palabras: [
            "taladro",
            "esmeril",
            "lijadora",
            "sierra circular",
            "rotomartillo",
            "soldador",
            "caladora",
        ],
    },
    {
        prefijo: "HER",
        categoria: "Herramientas manuales",
        palabras: [
            "martillo",
            "alicate",
            "destornillador",
            "llave ",
            "chicharra",
            "dado",
            "sierra",
            "arco",
            "lima",
        ],
    },
    {
        prefijo: "GAS",
        categoria: "Gasfitería",
        palabras: [
            "caneria",
            "fitting",
            "codo ",
            "codo de",
            "tee ",
            "tee de",
            "copla",
            "niple",
            "llave de paso",
            "ppr",
            "valvula",
        ],
    },
    {
        prefijo: "GASG",
        categoria: "Gas (cilindros)",
        palabras: ["balon de gas", "cilindro de gas", "butano", "propano"],
    },
    {
        prefijo: "MAT",
        categoria: "Materiales de construcción",
        palabras: [
            "cemento",
            "arena",
            "gravilla",
            "yeso",
            "ladrillo",
            "volcanita",
            "plancha yeso",
            "mortero",
            "hormigon",
        ],
    },
    {
        prefijo: "MAD",
        categoria: "Maderas",
        palabras: ["pino", "terciado", "mdf", "liston", "moldura", "tabla "],
    },
    {
        prefijo: "BIS",
        categoria: "Bisagras y cerraduras",
        palabras: [
            "bisagra",
            "cerradura",
            "candado",
            "picaporte",
            "pestillo",
            "cerrojo",
            "manilla",
        ],
    },
    {
        prefijo: "FIJ",
        categoria: "Fijaciones",
        palabras: ["remache", "abrazadera", "cincho"],
    },
    {
        prefijo: "ROD",
        categoria: "Ruedas y rodamientos",
        palabras: ["rueda", "rodamiento", "balero", "ruleman", "neumatico"],
    },
    {
        prefijo: "LIM",
        categoria: "Limpieza",
        palabras: [
            "detergente",
            "cloro",
            "esponja",
            "escoba",
            "trapero",
            "mopa",
            "balde",
        ],
    },
    {
        prefijo: "EPP",
        categoria: "Seguridad / EPP",
        palabras: [
            "guante",
            "gafas",
            "antiparra",
            "casco",
            "audifono",
            "mascarilla",
            "zapatos de seguridad",
            "chaleco",
        ],
    },
    {
        prefijo: "BOL",
        categoria: "Embalaje",
        palabras: [
            "bolsa",
            "cinta de embalaje",
            "film",
            "strech",
            "caja de carton",
        ],
    },
];

// Fallback cuando el nombre no contiene ninguna palabra clave.
const FALLBACK = { prefijo: "GEN", categoria: "General" };

/** Normaliza un texto: minúsculas + sin acentos. */
function normalizar(texto) {
    return (texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .trim();
}

/**
 * Detecta la categoría y prefijo a partir del nombre del producto.
 * Devuelve { categoria, prefijo }. Si el nombre está vacío devuelve el FALLBACK.
 * Si no hay match con ninguna palabra clave, devuelve el FALLBACK (nunca null).
 */
export function detectarCategoria(nombre) {
    const texto = normalizar(nombre);
    if (!texto) return FALLBACK;
    for (const regla of PALABRAS_CLAVE) {
        for (const palabra of regla.palabras) {
            if (texto.includes(palabra)) {
                return { categoria: regla.categoria, prefijo: regla.prefijo };
            }
        }
    }
    return FALLBACK;
}

/** Genera un código con formato PRE-NNN (prefijo + correlativo 3 dígitos). */
export function generarCodigo(prefijo, correlativo) {
    if (!prefijo) return "";
    const n = Math.max(1, Number(correlativo) || 1);
    return `${prefijo}-${String(n).padStart(3, "0")}`;
}

/**
 * Parsea un código existente tipo "TOR-042" o "PER-1".
 * Devuelve { prefijo, numero } o null si no calza con el formato.
 */
export function parsearCodigo(codigo) {
    if (!codigo) return null;
    const match = String(codigo)
        .trim()
        .toUpperCase()
        .match(/^([A-Z]{2,5})-(\d+)$/);
    if (!match) return null;
    return { prefijo: match[1], numero: Number(match[2]) };
}
