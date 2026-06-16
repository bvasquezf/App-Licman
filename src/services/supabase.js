import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Clave en localStorage que persiste la preferencia "Recordar sesión".
// Vive en localStorage a propósito: si no, se borraría al cerrar la pestaña
// y la preferencia no sobreviviría entre sesiones.
const REMEMBER_KEY = "app_bodega_remember_session";

export const getRememberPreference = () => {
    try {
        return localStorage.getItem(REMEMBER_KEY) === "true";
    } catch {
        return false;
    }
};

export const setRememberPreference = (value) => {
    try {
        if (value) {
            localStorage.setItem(REMEMBER_KEY, "true");
        } else {
            localStorage.removeItem(REMEMBER_KEY);
        }
    } catch {
        // Si localStorage no está disponible, ignoramos
    }
};

// Storage adapter personalizado:
// - Si el usuario marcó "Recordar sesión" → usa localStorage (persiste entre pestañas/cierres)
// - Si NO lo marcó → usa sessionStorage (se borra al cerrar la pestaña)
// En ambos casos, al hacer removeItem se limpian los dos por seguridad.
const createAuthStorage = () => ({
    getItem: (key) => {
        const remembered = getRememberPreference();
        const primary = remembered ? localStorage : sessionStorage;
        const fallback = remembered ? sessionStorage : localStorage;

        const value = primary.getItem(key);
        if (value !== null) return value;
        return fallback.getItem(key);
    },
    setItem: (key, value) => {
        const remembered = getRememberPreference();
        const target = remembered ? localStorage : sessionStorage;
        const other = remembered ? sessionStorage : localStorage;

        target.setItem(key, value);
        other.removeItem(key);
    },
    removeItem: (key) => {
        try {
            localStorage.removeItem(key);
        } catch {
            // ignorar
        }
        try {
            sessionStorage.removeItem(key);
        } catch {
            // ignorar
        }
    },
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: createAuthStorage(),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
});
