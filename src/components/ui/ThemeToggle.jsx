import { useTheme } from "../../context/ThemeContext";

/**
 * ThemeToggle
 * -----------
 * Botón compacto para alternar el tema claro y oscuro.
 * Variantes:
 *   - "sidebar": sobre fondo oscuro (el sidebar carbón siempre es dark)
 *   - "topbar":  sobre fondo claro/oscuro según el tema activo
 */
function ThemeToggle({ variante = "topbar" }) {
    const { theme, toggleTheme } = useTheme();
    const esDark = theme === "dark";

    const clasesPorVariante = {
        sidebar:
            "text-neutral-300 hover:bg-white/10 hover:text-white focus-visible:ring-white/40",
        topbar:
            "text-slate-600 hover:bg-slate-900/5 hover:text-slate-950 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white",
        login:
            "text-slate-500 hover:bg-slate-900/5 hover:text-slate-950 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white",
    };

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={`group flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 active:scale-95 ${clasesPorVariante[variante] ?? clasesPorVariante.topbar}`}
            aria-label={esDark ? "Activar tema claro" : "Activar tema oscuro"}
            aria-pressed={esDark}
            title={esDark ? "Tema claro" : "Tema oscuro"}
        >
            <span className="relative block h-5 w-5" aria-hidden="true">
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
                        esDark
                            ? "rotate-0 scale-100 opacity-100"
                            : "-rotate-90 scale-50 opacity-0"
                    }`}
                >
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
                </svg>
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
                        esDark
                            ? "rotate-90 scale-50 opacity-0"
                            : "rotate-0 scale-100 opacity-100"
                    }`}
                >
                    <path d="M20.4 15.3A8.5 8.5 0 0 1 8.7 3.6 8.5 8.5 0 1 0 20.4 15.3Z" />
                </svg>
            </span>
        </button>
    );
}

export default ThemeToggle;
