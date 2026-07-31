import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
    SECCIONES_PRINCIPALES,
    getSeccionActiva,
} from "./subNavConfig";
import ThemeToggle from "../components/ui/ThemeToggle";

/**
 * Sidebar
 * -------
 * Sidebar estilo Instagram:
 *   - Desktop: solo iconos (`w-16` = 64px). Al hacer hover se expande
 *     a `w-60` (240px) mostrando los labels. La sub-nav interna vive
 *     en el header (SubNavBar), no acá.
 *   - Mobile: drawer controlado por `abiertoMobile`. Siempre expandido
 *     (no hay hover en touch).
 *
 * Los 3 items son de primer nivel: Bodega, Equipos, Mantenimiento.
 * Click en uno navega a la ruta principal (`/bodega`, etc.) y la
 * sub-nav del header muestra el resto.
 */
export function Sidebar({ abiertoMobile, onCerrarMobile }) {
    const [expandidoDesktop, setExpandidoDesktop] = useState(false);
    const location = useLocation();

    // Cierra el drawer mobile al cambiar de ruta
    useEffect(() => {
        if (abiertoMobile) onCerrarMobile?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    // Cierra el drawer mobile con Escape
    useEffect(() => {
        if (!abiertoMobile) return;
        const handler = (e) => {
            if (e.key === "Escape") onCerrarMobile?.();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [abiertoMobile, onCerrarMobile]);

    // Body scroll lock cuando el drawer mobile está abierto
    useEffect(() => {
        if (!abiertoMobile) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [abiertoMobile]);

    return (
        <>
            {/* Backdrop mobile */}
            {abiertoMobile && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
                    onClick={onCerrarMobile}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar mobile (drawer) */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform bg-gradient-to-b from-carbon-900 to-carbon-950 p-5 text-white shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
                    abiertoMobile ? "translate-x-0" : "-translate-x-full"
                }`}
                style={{
                    paddingTop: "max(1rem, env(safe-area-inset-top))",
                }}
                aria-label="Navegación principal"
            >
                <SidebarContenido
                    expandido
                    onCerrarMobile={onCerrarMobile}
                />
            </aside>

            {/* Sidebar desktop: collapsed icons → expand on hover */}
            <aside
                onMouseEnter={() => setExpandidoDesktop(true)}
                onMouseLeave={() => setExpandidoDesktop(false)}
                onFocus={() => setExpandidoDesktop(true)}
                onBlur={() => setExpandidoDesktop(false)}
                className={`fixed inset-y-0 left-0 z-30 hidden overflow-hidden bg-gradient-to-b from-carbon-900 to-carbon-950 text-white shadow-[8px_0_24px_rgba(27,26,26,0.20)] transition-[width] duration-200 ease-out md:flex md:flex-col ${
                    expandidoDesktop ? "md:w-60" : "md:w-16"
                }`}
                aria-label="Navegación principal"
            >
                <SidebarContenido expandido={expandidoDesktop} />
            </aside>
        </>
    );
}

/**
 * Contenido compartido del sidebar. En estado colapsado muestra solo
 * el logo y los iconos centrados; en expandido muestra los labels.
 *
 * Layout:
 *   - Logo: bien centrado verticalmente con padding generoso.
 *   - Nav items: iconos grandes + label legible cuando expandido.
 *   - Footer: separado del borde inferior con padding.
 */
function SidebarContenido({ expandido, onCerrarMobile }) {
    const location = useLocation();
    const seccionActivaId = getSeccionActiva(location.pathname);

    return (
        <div className="flex h-full flex-col px-3 py-5 md:py-6">
            {/* Logo + título — con padding vertical generoso para
                que no quede pegado al borde superior */}
            <div
                className={`flex shrink-0 items-center gap-3 pb-6 ${
                    expandido ? "px-1" : "justify-center"
                }`}
            >
                <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-white shadow-lg animate-pop-in"
                    aria-hidden="true"
                >
                    <img
                        src="/favicon.png"
                        alt="Licman"
                        className="h-8 w-8 object-contain"
                    />
                </div>
                {expandido && (
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-extrabold tracking-wide text-white">
                            LICMAN
                        </p>
                        <p className="truncate text-[11px] text-neutral-400">
                            Gestión integral
                        </p>
                    </div>
                )}
                {expandido && onCerrarMobile && (
                    <button
                        type="button"
                        onClick={onCerrarMobile}
                        className="ml-auto flex h-11 w-11 items-center justify-center rounded-[10px] text-neutral-400 hover:bg-white/10 hover:text-white"
                        aria-label="Cerrar menú"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Separador */}
            <div
                className={`mb-3 h-px shrink-0 bg-white/10 ${expandido ? "" : "mx-3"}`}
                aria-hidden="true"
            />

            {/* Sección principal: 3 items (Bodega / Equipos / Mantenimiento) */}
            <nav
                className="flex-1 space-y-1.5 overflow-y-auto py-2"
                aria-label="Secciones principales"
            >
                {SECCIONES_PRINCIPALES.map((sec) => {
                    const activa = sec.id === seccionActivaId;
                    return (
                        <NavLink
                            key={sec.id}
                            to={sec.to}
                            end
                            title={expandido ? undefined : sec.title}
                            className={() =>
                                `group flex items-center gap-3 rounded-[12px] py-3 text-base font-semibold transition ${
                                    expandido ? "px-3" : "justify-center px-2"
                                } ${
                                    activa
                                        ? "bg-gradient-to-r from-brand-500/25 via-brand-500/10 to-transparent text-white shadow-[inset_3px_0_0_#ff1a22]"
                                        : "text-neutral-300 hover:bg-white/10 hover:text-white"
                                }`
                            }
                        >
                            <span
                                className="text-2xl leading-none transition-transform group-hover:scale-110"
                                aria-hidden="true"
                            >
                                {sec.icon}
                            </span>
                            {expandido && (
                                <span className="whitespace-nowrap">
                                    {sec.title}
                                </span>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* Footer — con padding-top y padding-bottom para que no
                quede pegado al borde inferior ni al último item */}
            <div
                className={`shrink-0 border-t border-white/10 pt-4 pb-2 ${
                    expandido ? "" : "mx-1"
                }`}
            >
                <div
                    className={`mb-2 flex items-center ${
                        expandido ? "" : "justify-center"
                    }`}
                >
                    <ThemeToggle
                        variante="sidebar"
                        mostrarLabel={expandido}
                    />
                </div>
                <div
                    className={`flex items-center gap-2 text-[11px] font-medium text-neutral-500 ${
                        expandido ? "" : "justify-center"
                    }`}
                >
                    <span
                        className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                        aria-hidden="true"
                    />
                    {expandido ? <span>v1.0 · online</span> : <span>v1.0</span>}
                </div>
            </div>
        </div>
    );
}