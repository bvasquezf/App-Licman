import { useTheme } from "../../context/ThemeContext";

function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === "dark";

    return (
        <button
            onClick={toggleTheme}
            aria-label={
                isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
            }
            title={
                isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
            }
            className="group relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-slate-200/60 bg-white text-slate-600 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:text-slate-900 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
        >
            {/* Sol (visible en dark mode para indicar que al hacer click pasa a light) */}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`absolute transition-all duration-300 ${
                    isDark
                        ? "rotate-0 scale-100 opacity-100"
                        : "rotate-90 scale-0 opacity-0"
                }`}
            >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
            </svg>

            {/* Luna (visible en light mode) */}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`absolute transition-all duration-300 ${
                    isDark
                        ? "rotate-90 scale-0 opacity-0"
                        : "rotate-0 scale-100 opacity-100"
                }`}
            >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
        </button>
    );
}

export default ThemeToggle;
