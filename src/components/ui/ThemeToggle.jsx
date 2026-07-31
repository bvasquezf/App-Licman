import { useTheme } from "../../context/ThemeContext";

/**
 * ThemeToggle
 * -----------
 * Botón para alternar entre modo día (light) y modo nocturno (dark).
 * Variantes:
 *   - "sidebar": sobre fondo oscuro (el sidebar carbón siempre es dark)
 *   - "topbar":  sobre fondo claro/oscuro según el tema activo
 */
function ThemeToggle({ variante = "topbar", mostrarLabel = false }) {
    const { theme, toggleTheme } = useTheme();
    const esDark = theme === "dark";

    const clasesPorVariante = {
        sidebar:
            "text-neutral-300 hover:bg-white/10 hover:text-white",
        topbar:
            "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-carbon-900 dark:text-neutral-200 dark:hover:bg-carbon-800",
    };

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-[10px] px-2 text-lg transition ${clasesPorVariante[variante]}`}
            aria-label={esDark ? "Cambiar a modo día" : "Cambiar a modo nocturno"}
            title={esDark ? "Modo día" : "Modo nocturno"}
        >
            <span aria-hidden="true">{esDark ? "☀️" : "🌙"}</span>
            {mostrarLabel && (
                <span className="text-sm font-medium">
                    {esDark ? "Modo día" : "Modo nocturno"}
                </span>
            )}
        </button>
    );
}

export default ThemeToggle;
