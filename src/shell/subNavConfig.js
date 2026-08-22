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
            label: "Dashboard",
            icon: "📊",
            end: true,
        },
        {
            to: "/bodega/productos",
            label: "Productos",
            icon: "🏷️",
        },
        {
            to: "/bodega/nueva-entrada",
            label: "Nueva entrada",
            icon: "⬇️",
        },
        {
            to: "/bodega/nueva-salida",
            label: "Nueva salida",
            icon: "⬆️",
        },
        {
            to: "/bodega/stock",
            label: "Stock actual",
            icon: "📋",
        },
        {
            to: "/bodega/historial",
            label: "Historial",
            icon: "🕓",
        },
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
        },
        {
            to: "/equipos/movimientos",
            label: "Movimientos",
            icon: "🕓",
        },
        {
            to: "/equipos/baterias",
            label: "Baterías",
            icon: "🔋",
        },
        {
            to: "/equipos/papelera",
            label: "Papelera",
            icon: "🗑️",
        },
        {
            to: "/equipos/clientes",
            label: "Clientes",
            icon: "👥",
        },
        {
            to: "/equipos/exportar",
            label: "Exportar",
            icon: "⬇️",
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
        },
        {
            to: "/tareas/mis-tareas",
            label: "Mis tareas",
            icon: "🪪",
        },
        {
            to: "/tareas/por-programar",
            label: "Por programar",
            icon: "📥",
        },
        {
            to: "/tareas/calendario",
            label: "Calendario",
            icon: "📅",
        },
        {
            to: "/tareas/tecnicos",
            label: "Por técnico",
            icon: "👷",
        },
        {
            to: "/tareas/tablero",
            label: "Tablero",
            icon: "📋",
        },
        {
            to: "/tareas/finalizadas",
            label: "Finalizadas",
            icon: "✅",
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
