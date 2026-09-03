import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
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
                className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/90 px-3 pb-3 backdrop-blur-xl supports-[backdrop-filter]:bg-white/75 dark:border-white/10 dark:bg-carbon-900/90 dark:supports-[backdrop-filter]:bg-carbon-900/75 sm:px-4 md:hidden"
                style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
            >
                <div className="relative flex min-h-11 items-center justify-between">
                    <button
                        type="button"
                        onClick={() => setMenuAbierto(true)}
                        className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-700 transition-[background-color,color,transform] duration-200 hover:bg-slate-900/5 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 active:scale-95 dark:text-neutral-200 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label="Abrir menú"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.9"
                            strokeLinecap="round"
                            aria-hidden="true"
                            className="h-6 w-6"
                        >
                            <path d="M4 7h16M4 12h16M4 17h16" />
                        </svg>
                    </button>

                    {/* El wordmark queda centrado en la pantalla, independiente
                        del ancho de las acciones laterales. */}
                    <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                        <img
                            src="/logo.png"
                            alt="Licman"
                            className="h-5 w-auto animate-logo-reveal dark:hidden sm:h-6"
                        />
                        <img
                            src="/logo.png"
                            alt="Licman"
                            className="hidden h-5 w-auto animate-logo-reveal dark:block sm:h-6"
                            style={{ filter: "url(#licman-dark-wordmark)" }}
                        />
                    </div>

                    <div className="relative z-10 flex items-center">
                        <ThemeToggle />
                        <Link
                            to="/perfil"
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-black text-white shadow-sm transition-[background-color,transform,box-shadow] duration-200 hover:bg-brand-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 active:scale-95 dark:focus-visible:ring-offset-carbon-900"
                            aria-label="Abrir mi perfil"
                        >
                            {inicialesNombre(profile?.nombre_completo)}
                        </Link>
                    </div>
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

                El wrapper solo fija la posición sticky; el ancho y el
                padding viven en el contenedor interno de SubNavBar, que
                usa EXACTAMENTE la misma receta que <main> para que la
                barra y el contenido queden alineados en todo breakpoint. */}
            <div className="app-subnav-sticky sticky z-10">
                <SubNavBar />
            </div>

            {/* Contenido principal.
                Marco único para TODAS las secciones (bodega, equipos,
                mantenimiento y tareas): mismo ancho máximo y mismo
                padding simétrico, así al cambiar de módulo el encuadre
                no se mueve. El sidebar es `position: fixed` (no ocupa
                flujo): el padding izquierdo solo evita que el contenido
                choque con los iconos y el derecho balancea el layout,
                dejando el cuerpo visualmente centrado en el viewport.

                Si se cambia esta receta, actualizar también el contenedor
                interno de SubNavBar para que sigan alineados. */}
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
