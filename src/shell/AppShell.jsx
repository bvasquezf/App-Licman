import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { SubNavBar } from "./SubNavBar";
import ThemeToggle from "../components/ui/ThemeToggle";
import { useAuth } from "../context/AuthContext";
import { inicialesNombre } from "../lib/authPermissions";

/**
 * AppShell
 * --------
 * Shell unificado de la SPA. Contiene:
 *  - Sidebar slate-900 estilo Instagram (iconos → expand on hover)
 *  - Topbar mobile con hamburger (solo visible <md)
 *  - SubNavBar horizontal bajo el topbar con las sub-secciones
 *  - <main> con el contenido de la ruta actual
 *
 * El main reserva el ancho del sidebar COLAPSADO (md:ml-16 = 64px).
 * Cuando el sidebar se expande por hover, se superpone al main (no
 * empuja contenido) — es el comportamiento típico de sidebars estilo
 * Instagram/Dribbble/Linear.
 */
export function AppShell() {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const location = useLocation();
    const { profile } = useAuth();

    return (
        <div className="min-h-screen">
            {/* Filtro del wordmark para modo oscuro: vuelve blanco el gris
                del texto y conserva el rojo de la marca. Se declara inline
                para que funcione también en iOS Safari. */}
            <svg
                aria-hidden="true"
                className="pointer-events-none absolute h-0 w-0 overflow-hidden"
            >
                <defs>
                    <filter
                        id="licman-dark-wordmark"
                        colorInterpolationFilters="sRGB"
                    >
                        <feColorMatrix
                            type="matrix"
                            values="0 0 0 0 1
                                -1.1086 0 0 0 1.2106
                                -1.0704 0 0 0 1.2034
                                0 0 0 1 0"
                        />
                    </filter>
                </defs>
            </svg>

            {/* Topbar mobile (solo <md) */}
            <header
                className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/60 bg-white/80 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-carbon-900/80 md:hidden"
                style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
            >
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setMenuAbierto(true)}
                        className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-carbon-900 dark:text-neutral-200 dark:hover:bg-carbon-800"
                        aria-label="Abrir menú"
                    >
                        ☰
                    </button>
                    <div className="flex items-center gap-2">
                        <img
                            src="/logo.png"
                            alt="Licman"
                            className="h-6 w-auto animate-logo-reveal dark:hidden"
                        />
                        <img
                            src="/logo.png"
                            alt="Licman"
                            className="hidden h-6 w-auto animate-logo-reveal dark:block"
                            style={{ filter: "url(#licman-dark-wordmark)" }}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <p className="text-xs font-medium text-slate-500 dark:text-neutral-400">
                        {tituloPorRuta(location.pathname)}
                    </p>
                    <ThemeToggle />
                    <Link
                        to="/perfil"
                        className="ml-1 flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-xs font-black text-white shadow-sm"
                        aria-label="Abrir mi perfil"
                    >
                        {inicialesNombre(profile?.nombre_completo)}
                    </Link>
                </div>
            </header>

            {/* Sidebar */}
            <Sidebar
                abiertoMobile={menuAbierto}
                onCerrarMobile={() => setMenuAbierto(false)}
            />

            {/* Sub-nav horizontal — vive abajo del topbar (md+) o debajo
                del topbar mobile (<md). Es el reemplazo del antiguo
                sidebar con sub-items colapsables.

                Padding:
                  - Mobile: `px-4` (16px), sm: `px-6` (24px).
                  - Desktop: padding izquierdo = ancho del sidebar (64px).
                    Padding derecho igual (64px) para que el contenido
                    quede VISUALMENTE centrado en el viewport (el sidebar
                    es `position: fixed`, no ocupa flujo). */}
            <div className="sticky top-0 z-10 md:pl-16 md:pr-16">
                <SubNavBar />
            </div>

            {/* Contenido principal.
                Mismo principio que SubNavBar: padding simétrico para
                que el cuerpo se vea centrado. El sidebar es `fixed`,
                así que el padding-left solo evita que el texto choque
                con los iconos; el padding-right balancea el layout
                en pantallas anchas. */}
            <main
                className="mx-auto w-full max-w-screen-xl animate-fade-in px-4 py-6 sm:px-6 md:pl-16 md:pr-16 lg:pl-20 lg:pr-20"
                style={{
                    paddingBottom:
                        "max(1.5rem, env(safe-area-inset-bottom))",
                }}
            >
                <Outlet />
            </main>

            {/* Toasts globales los renderiza <ToastProvider> en main.jsx */}
        </div>
    );
}

/**
 * Devuelve un título corto para el topbar mobile según la ruta actual.
 * Es solo orientativo — el header completo vive dentro de cada vista.
 */
function tituloPorRuta(path) {
    if (path.startsWith("/bodega")) return "Bodega";
    if (path.startsWith("/equipos")) return "Equipos";
    if (path.startsWith("/mantenimiento")) return "Mantenimiento";
    if (path.startsWith("/tareas")) return "Tareas";
    if (path.startsWith("/perfil")) return "Mi perfil";
    if (path.startsWith("/usuarios")) return "Usuarios";
    return "LICMAN";
}
