import { NavLink, useLocation } from "react-router-dom";
import {
    SUB_NAV_POR_SECCION,
    getSeccionActiva,
} from "./subNavConfig";

/**
 * SubNavBar
 * ---------
 * Barra horizontal sticky bajo el topbar que muestra las sub-secciones
 * de la sección activa (Bodega / Equipos / Mantenimiento). Funciona
 * como el "tabs" interno de cada macro-sección.
 *
 * Mobile: debajo del topbar, scroll horizontal si no caben.
 * Desktop: debajo del topbar (que está oculto en md+, así que queda
 *          como la primera fila del viewport).
 *
 * Si no hay sección activa (URL rara, fallback), no renderiza nada.
 *
 * El padding horizontal vive en el WRAPPER del shell (AppShell.jsx),
 * no acá — así evitamos duplicarlo. El inner solo centra con
 * `mx-auto` + `max-w-screen-xl`.
 */
export function SubNavBar() {
    const location = useLocation();
    const seccionId = getSeccionActiva(location.pathname);
    const items = seccionId ? SUB_NAV_POR_SECCION[seccionId] ?? [] : [];

    if (items.length === 0) return null;

    return (
        <nav
            className="border-b border-slate-200/60 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:border-white/10 dark:bg-carbon-900/85 dark:supports-[backdrop-filter]:bg-carbon-900/70"
            aria-label="Navegación interna"
        >
            <div className="mx-auto flex w-full max-w-screen-xl gap-1.5 overflow-x-auto px-4 py-2.5 sm:px-6">
                {items.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                            `flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition min-h-[40px] sm:min-h-[44px] ${
                                isActive
                                    ? "border-brand-600 bg-brand-600 text-white shadow-[0_2px_8px_rgba(232,18,26,0.30)]"
                                    : "border-transparent text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:text-neutral-300 dark:hover:border-white/15 dark:hover:bg-white/10 dark:hover:text-white"
                            }`
                        }
                    >
                        <span aria-hidden="true">{item.icon}</span>
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}