import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { SubNavBar } from "./SubNavBar";

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

    return (
        <div className="min-h-screen">
            {/* Topbar mobile (solo <md) */}
            <header
                className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/60 bg-white/80 px-4 py-3 backdrop-blur md:hidden"
                style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
            >
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setMenuAbierto(true)}
                        className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        aria-label="Abrir menú"
                    >
                        ☰
                    </button>
                    <div className="flex items-center gap-2">
                        <div
                            className="flex h-7 w-7 items-center justify-center rounded-[8px] text-xs font-bold text-white"
                            style={{
                                background:
                                    "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)",
                            }}
                            aria-hidden="true"
                        >
                            IL
                        </div>
                        <p className="text-sm font-bold tracking-wide text-slate-900">
                            LICMAN
                        </p>
                    </div>
                </div>
                <p className="text-xs font-medium text-slate-500">
                    {TITULO_POR_RUTA(location.pathname)}
                </p>
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
                key={location.pathname}
                className="mx-auto w-full max-w-screen-xl animate-fade-in px-4 py-6 sm:px-6 md:pl-16 md:pr-16 lg:pl-20 lg:pr-20"
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
function TITULO_POR_RUTA(path) {
    if (path.startsWith("/bodega")) return "Bodega";
    if (path.startsWith("/equipos")) return "Equipos";
    if (path.startsWith("/mantenimiento")) return "Mantenimiento";
    return "LICMAN";
}