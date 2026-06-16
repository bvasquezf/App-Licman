import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../ui/ThemeToggle";

const menu = [
    { path: "/", label: "Dashboard", icon: "📊" },
    { path: "/productos", label: "Productos", icon: "📦" },
    { path: "/entradas", label: "Entradas", icon: "⬇️" },
    { path: "/salidas", label: "Salidas", icon: "⬆️" },
    { path: "/stock", label: "Stock", icon: "🗂️" },
    { path: "/historial", label: "Historial", icon: "📜" },
];

function SidebarContent({ onNavigate, collapsed = false }) {
    const location = useLocation();
    const { logout } = useAuth();

    return (
        <>
            {/* Logo / título */}
            <div
                className={`mb-6 flex items-center gap-3 lg:mb-8 ${
                    collapsed ? "justify-center px-0" : "px-2"
                }`}
            >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-lg text-white shadow-sm">
                    📦
                </div>
                {!collapsed && (
                    <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold text-white">
                            Control de Bodega
                        </h2>
                        <p className="text-xs text-slate-400">Inventario</p>
                    </div>
                )}
            </div>

            {/* Menú */}
            <nav className="flex flex-1 flex-col gap-1">
                {menu.map((item) => {
                    const active = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={onNavigate}
                            title={collapsed ? item.label : undefined}
                            className={`group flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                collapsed
                                    ? "justify-center px-2 py-2.5"
                                    : "px-3 py-2.5"
                            } ${
                                active
                                    ? "bg-slate-700/80 text-white shadow-sm"
                                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                            }`}
                        >
                            <span className="text-base">{item.icon}</span>
                            {!collapsed && <span>{item.label}</span>}
                            {!collapsed && active && (
                                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Theme toggle (solo en sidebar expandido) */}
            {!collapsed && (
                <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-slate-800/60 px-3 py-2">
                    <span className="text-xs text-slate-400">Tema</span>
                    <ThemeToggle />
                </div>
            )}

            {/* Cerrar sesión */}
            <button
                onClick={logout}
                title={collapsed ? "Cerrar sesión" : undefined}
                className={`mt-2 flex items-center gap-3 rounded-xl bg-slate-800/60 text-sm font-medium text-slate-300 transition-colors hover:bg-rose-600/90 hover:text-white ${
                    collapsed
                        ? "mt-4 justify-center px-2 py-2.5"
                        : "px-3 py-2.5"
                }`}
            >
                <span>🚪</span>
                {!collapsed && <span>Cerrar sesión</span>}
            </button>
        </>
    );
}

function Layout({ children }) {
    const [menuAbierto, setMenuAbierto] = useState(false);

    // Cerrar drawer con Escape
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") setMenuAbierto(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // Bloquear scroll del body cuando el drawer está abierto
    useEffect(() => {
        if (menuAbierto) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = prev;
            };
        }
    }, [menuAbierto]);

    return (
        <div className="bg-slate-50 dark:bg-slate-950">
            {/* ─── Header móvil (sticky) ──────────────────────────── */}
            <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-slate-200/60 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 md:hidden">
                <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-base text-white">
                        📦
                    </div>
                    <h1 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                        Control de Bodega
                    </h1>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <ThemeToggle />
                    <button
                        onClick={() => setMenuAbierto(true)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        aria-label="Abrir menú"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                </div>
            </header>

            {/* ─── Sidebar tablet (md a lg) - colapsado 64px ────────── */}
            <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-16 md:flex-col md:bg-slate-900 md:p-3 md:text-white md:dark:bg-slate-950 lg:hidden">
                <SidebarContent collapsed />
            </aside>

            {/* ─── Sidebar desktop (lg en adelante) - expandido 240px ── */}
            <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-60 lg:flex-col lg:bg-slate-900 lg:p-5 lg:text-white lg:dark:bg-slate-950">
                <SidebarContent />
            </aside>

            {/* ─── Drawer en mobile (<md) ───────────────────────────── */}
            {menuAbierto && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
                    onClick={() => setMenuAbierto(false)}
                    aria-hidden="true"
                />
            )}
            <aside
                className={`fixed left-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-slate-900 p-6 text-white shadow-2xl transition-transform duration-300 ease-out dark:bg-slate-950 md:hidden ${
                    menuAbierto ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <button
                    onClick={() => setMenuAbierto(false)}
                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                    aria-label="Cerrar menú"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
                <SidebarContent onNavigate={() => setMenuAbierto(false)} />
            </aside>

            {/* ─── Contenido ──────────────────────────────────────── */}
            <main
                className="w-full max-w-7xl overflow-x-hidden px-4 pb-8 md:ml-16 md:px-6 md:pb-10 lg:ml-60 lg:px-6 lg:pb-12 xl:px-8"
                style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
            >
                {children}
            </main>
        </div>
    );
}

export default Layout;
