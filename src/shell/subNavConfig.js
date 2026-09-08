/**
 * subNavConfig.jsx
 * ----------------
 * Configuración de la navegación principal de la SPA.
 *
 * Hay 2 niveles:
 *   1. SECCIONES_PRINCIPALES — los 3 ítems del sidebar (iconos).
 *   2. SUB_NAV_POR_SECCION — los sub-ítems que aparecen en la barra
 *      horizontal del header (SubNavBar) según la sección activa.
 *
 * Esto centraliza el orden y labels para que no haya drift entre el
 * sidebar y la sub-nav.
 */

import { PERMISOS } from "../lib/authPermissions";

// Orden de las secciones principales (izquierda → derecha en el sidebar).
export const SECCIONES_PRINCIPALES = [
    {
        id: "bodega",
        title: "Bodega",
        short: "Bodega",
        icon: "📦",
        to: "/bodega",
        permiso: PERMISOS.BODEGA,
    },
    {
        id: "equipos",
        title: "Equipos",
        short: "Equipos",
        icon: "🏗️",
        to: "/equipos",
        permiso: PERMISOS.EQUIPOS,
    },
    {
        id: "mantenimiento",
        title: "Mantenimiento",
        short: "Mantto.",
        icon: "📈",
        to: "/mantenimiento",
        permiso: PERMISOS.MANTENIMIENTO,
    },
    {
        id: "tareas",
        title: "Tareas",
        short: "Tareas",
        icon: "📋",
        to: "/tareas",
        permiso: PERMISOS.TAREAS,
    },
];

// Sub-nav horizontal que aparece en el header según la sección activa.
export const SUB_NAV_POR_SECCION = {
    bodega: [
        {
            to: "/bodega",
            label: "Resumen",
            icon: "📊",
            end: true,
        },
        {
            to: "/bodega/productos",
            permiso: PERMISOS.BODEGA_PRODUCTOS,
            label: "Crear / editar productos",
            icon: "🏷️",
        },
        {
            to: "/bodega/nueva-entrada",
            permiso: PERMISOS.BODEGA_INGRESAR,
            label: "Ingresar compra",
            icon: "⬇️",
        },
        {
            to: "/bodega/nueva-salida",
            permiso: PERMISOS.BODEGA_RETIRAR,
            label: "Retirar productos",
            icon: "⬆️",
        },
        {
            to: "/bodega/stock",
            label: "Stock actual",
            icon: "📋",
        },
        {
            to: "/bodega/historial",
            permiso: PERMISOS.BODEGA_HISTORIAL,
            label: "Historial",
            icon: "🕓",
        },
        { to: "/bodega/devoluciones", label: "Devoluciones", icon: "↩️", permiso: PERMISOS.BODEGA_DEVOLVER },
        { to: "/bodega/reposicion", label: "Por comprar", icon: "🛒" },
    ],
    equipos: [
        {
            to: "/equipos",
            label: "Inventario",
            icon: "📋",
            end: true,
        },
        {
            to: "/equipos/registrar",
            label: "Registrar",
            icon: "📝",
            permiso: PERMISOS.EQUIPOS_REGISTRAR,
        },
        {
            to: "/equipos/movimientos",
            label: "Movimientos",
            icon: "🕓",
            permiso: PERMISOS.EQUIPOS_VER_HISTORIAL,
        },
        {
            to: "/equipos/baterias",
            label: "Baterías",
            icon: "🔋",
            permiso: PERMISOS.EQUIPOS_GESTIONAR_BATERIAS,
        },
        {
            to: "/equipos/papelera",
            label: "Papelera",
            icon: "🗑️",
            permiso: PERMISOS.EQUIPOS_ELIMINAR,
        },
        {
            to: "/equipos/clientes",
            label: "Clientes",
            icon: "👥",
            permiso: PERMISOS.EQUIPOS_GESTIONAR_CLIENTES,
        },
        {
            to: "/equipos/exportar",
            label: "Exportar",
            icon: "⬇️",
            permiso: PERMISOS.EQUIPOS_EXPORTAR,
        },
    ],
    mantenimiento: [
        {
            to: "/mantenimiento",
            label: "Resumen ejecutivo",
            icon: "📊",
            end: true,
        },
        {
            to: "/mantenimiento/tecnicos",
            label: "Por técnico",
            icon: "👷",
        },
        {
            to: "/mantenimiento/reincidencia",
            label: "Reincidencia",
            icon: "🔁",
        },
        {
            to: "/mantenimiento/tiempos",
            label: "Tiempos",
            icon: "⏱️",
        },
    ],
    tareas: [
        {
            to: "/tareas",
            label: "Hoy",
            icon: "☀️",
            end: true,
            permiso: PERMISOS.TAREAS,
        },
        {
            to: "/tareas/mis-tareas",
            label: "Mis tareas",
            icon: "🪪",
            permiso: PERMISOS.TAREAS_EJECUTAR_PROPIAS,
        },
        {
            to: "/tareas/por-programar",
            label: "Requerimientos",
            icon: "📥",
            permiso: PERMISOS.TAREAS,
        },
        {
            to: "/tareas/calendario",
            label: "Calendario",
            icon: "📅",
            permiso: PERMISOS.TAREAS,
        },
        {
            to: "/tareas/semana",
            label: "Semana",
            icon: "🗓️",
            permiso: PERMISOS.TAREAS,
        },
        {
            to: "/tareas/tecnicos",
            label: "Por técnico",
            icon: "👷",
            permiso: PERMISOS.TAREAS,
        },
        {
            to: "/tareas/tablero",
            label: "Tablero",
            icon: "📋",
            permiso: PERMISOS.TAREAS,
        },
        {
            to: "/tareas/finalizadas",
            label: "Finalizadas",
            icon: "✅",
            permiso: PERMISOS.TAREAS,
        },
        {
            to: "/tareas/eliminadas",
            label: "Papelera",
            icon: "🗑️",
            permiso: PERMISOS.TAREAS_ELIMINAR,
        },
        {
            to: "/tareas/pantalla",
            label: "Pantalla TV",
            icon: "📺",
            permiso: PERMISOS.TAREAS,
        },
    ],
};

/**
 * Devuelve el id de la sección activa según el pathname actual.
 * Si la ruta no matchea ninguna sección conocida, devuelve null.
 */
export function getSeccionActiva(pathname) {
    for (const sec of SECCIONES_PRINCIPALES) {
        if (pathname === `/${sec.id}` || pathname.startsWith(`/${sec.id}/`)) {
            return sec.id;
        }
    }
    return null;
}
