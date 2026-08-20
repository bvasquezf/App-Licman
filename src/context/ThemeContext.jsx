import { createContext, useContext, useEffect, useRef, useState } from "react";

const ThemeContext = createContext();

const STORAGE_KEY = "licman_theme";

const getInitialTheme = () => {
    if (typeof window === "undefined") return "light";

    // 1) Preferencia guardada del usuario
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;

    // 2) Preferencia del sistema operativo
    if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
        return "dark";
    }

    return "light";
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(getInitialTheme);
    const transitionTimerRef = useRef(null);

    // Aplicar/quitar la clase `dark` en el <html> para que Tailwind
    // active las variantes `dark:*`.
    useEffect(() => {
        const root = document.documentElement;
        if (theme === "dark") {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    // Escuchar cambios en la preferencia del SO solo si el usuario
    // no ha forzado uno manualmente.
    useEffect(() => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = (e) => {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored !== "light" && stored !== "dark") {
                setTheme(e.matches ? "dark" : "light");
            }
        };
        mq.addEventListener?.("change", onChange);
        return () => mq.removeEventListener?.("change", onChange);
    }, []);

    useEffect(
        () => () => {
            if (transitionTimerRef.current) {
                window.clearTimeout(transitionTimerRef.current);
            }
        },
        [],
    );

    const toggleTheme = () => {
        const root = document.documentElement;
        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        if (!reduceMotion) {
            root.classList.add("theme-transitioning");
            if (transitionTimerRef.current) {
                window.clearTimeout(transitionTimerRef.current);
            }
            transitionTimerRef.current = window.setTimeout(() => {
                root.classList.remove("theme-transitioning");
                transitionTimerRef.current = null;
            }, 420);
        }
        setTheme((t) => (t === "dark" ? "light" : "dark"));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error("useTheme debe usarse dentro de un <ThemeProvider>");
    }
    return ctx;
};
