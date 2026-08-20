export const PERMISOS = {
    BODEGA: "bodega.usar",
    EQUIPOS: "equipos.usar",
    MANTENIMIENTO: "mantenimiento.usar",
    TAREAS: "tareas.usar",
    USUARIOS: "usuarios.gestionar",
    SUPERADMIN: "usuarios.superadmin",
};

export const MODULOS_ACCESO = [
    { permiso: PERMISOS.BODEGA, ruta: "/bodega", nombre: "Bodega" },
    { permiso: PERMISOS.EQUIPOS, ruta: "/equipos", nombre: "Equipos" },
    {
        permiso: PERMISOS.MANTENIMIENTO,
        ruta: "/mantenimiento",
        nombre: "Mantenimiento",
    },
    { permiso: PERMISOS.TAREAS, ruta: "/tareas", nombre: "Tareas" },
];

export function rutaInicialParaPermisos(permisos = []) {
    const disponibles = permisos instanceof Set ? permisos : new Set(permisos);
    return (
        MODULOS_ACCESO.find(({ permiso }) => disponibles.has(permiso))?.ruta ??
        "/sin-acceso"
    );
}

export function inicialesNombre(nombre = "") {
    const partes = String(nombre).trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return "U";
    return partes
        .slice(0, 2)
        .map((parte) => parte.charAt(0).toUpperCase())
        .join("");
}
