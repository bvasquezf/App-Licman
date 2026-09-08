export const PERMISOS = {
    BODEGA: "bodega.usar",
    BODEGA_PRODUCTOS: "bodega.productos",
    BODEGA_INGRESAR: "bodega.ingresar",
    BODEGA_RETIRAR: "bodega.retirar",
    BODEGA_DEVOLVER: "bodega.devolver",
    BODEGA_HISTORIAL: "bodega.historial",
    EQUIPOS: "equipos.usar",
    EQUIPOS_REGISTRAR: "equipos.registrar",
    EQUIPOS_EDITAR: "equipos.editar",
    EQUIPOS_MOVER: "equipos.mover",
    EQUIPOS_VER_HISTORIAL: "equipos.ver_historial",
    EQUIPOS_GESTIONAR_BATERIAS: "equipos.gestionar_baterias",
    EQUIPOS_CAMBIAR_ESTADO: "equipos.cambiar_estado",
    EQUIPOS_ELIMINAR: "equipos.eliminar",
    EQUIPOS_GESTIONAR_CLIENTES: "equipos.gestionar_clientes",
    EQUIPOS_EXPORTAR: "equipos.exportar",
    EQUIPOS_REGULARIZAR_UBICACION: "equipos.regularizar_ubicacion",
    MANTENIMIENTO: "mantenimiento.usar",
    TAREAS: "tareas.usar",
    TAREAS_PLANIFICAR: "tareas.planificar",
    TAREAS_EJECUTAR_PROPIAS: "tareas.ejecutar_propias",
    TAREAS_ELIMINAR: "tareas.eliminar",
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
    const tieneOtroModulo = [
        PERMISOS.BODEGA,
        PERMISOS.EQUIPOS,
        PERMISOS.MANTENIMIENTO,
    ].some((permiso) => disponibles.has(permiso));
    if (
        !tieneOtroModulo &&
        disponibles.has(PERMISOS.TAREAS) &&
        disponibles.has(PERMISOS.TAREAS_EJECUTAR_PROPIAS) &&
        !disponibles.has(PERMISOS.TAREAS_PLANIFICAR)
    ) {
        return "/tareas/mis-tareas";
    }
    const modulosConVista = MODULOS_ACCESO.filter(
        ({ permiso }) =>
            permiso !== PERMISOS.TAREAS ||
            disponibles.has(PERMISOS.TAREAS_PLANIFICAR) ||
            disponibles.has(PERMISOS.TAREAS_EJECUTAR_PROPIAS),
    );
    return (
        modulosConVista.find(({ permiso }) => disponibles.has(permiso))?.ruta ??
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
