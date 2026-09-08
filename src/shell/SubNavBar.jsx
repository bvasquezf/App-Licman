import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
    SUB_NAV_POR_SECCION,
    getSeccionActiva,
} from "./subNavConfig";
import { useAuth } from "../context/AuthContext";

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
 * El contenedor interno usa la MISMA receta de ancho y padding que
 * <main> en AppShell.jsx (`max-w-screen-xl` + padding simétrico
 * responsivo), así la barra queda alineada con el contenido de todas
 * las secciones. Si se cambia el marco del main, cambiarlo acá también.
 */
export function SubNavBar() {
    const location = useLocation();
    const itemActivoRef = useRef(null);
    const { puede } = useAuth();
    const seccionId = getSeccionActiva(location.pathname);
    const items = seccionId
        ? (SUB_NAV_POR_SECCION[seccionId] ?? []).filter(
              (item) =>
                  (!item.permiso || puede(item.permiso)) &&
                  (!item.ocultarConPermiso ||
                      !puede(item.ocultarConPermiso)),
          )
        : [];

    useEffect(() => {
        const reducirMovimiento = window.matchMedia?.(
            "(prefers-reduced-motion: reduce)",
        ).matches;
        itemActivoRef.current?.scrollIntoView({
            behavior: reducirMovimiento ? "auto" : "smooth",
            block: "nearest",
            inline: "center",
        });
    }, [location.pathname]);

    if (items.length === 0) return null;

    return (
        <nav
            className="border-b border-slate-200/60 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:border-white/10 dark:bg-carbon-900/85 dark:supports-[backdrop-filter]:bg-carbon-900/70"
            aria-label="Navegación interna"
        >
            <div className="scrollbar-none mx-auto flex w-full max-w-screen-xl gap-1.5 overflow-x-auto overscroll-x-contain px-4 py-2.5 sm:px-6 md:pl-16 md:pr-16 lg:pl-20 lg:pr-20">
                {items.map((item) => {
                    const activo = item.end
                        ? location.pathname === item.to
                        : location.pathname === item.to ||
                          location.pathname.startsWith(`${item.to}/`);
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            ref={activo ? itemActivoRef : null}
                            className={({ isActive }) =>
                                `flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${
                                    isActive
                                        ? "border-brand-600 bg-brand-600 text-white shadow-[0_2px_8px_rgba(232,18,26,0.30)]"
                                        : "border-transparent text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:text-neutral-300 dark:hover:border-white/15 dark:hover:bg-white/10 dark:hover:text-white"
                                }`
                            }
                        >
                            <span aria-hidden="true">{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
}
