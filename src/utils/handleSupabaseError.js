// Mapea errores de Supabase, red y auth a mensajes legibles en español.
// Devuelve un objeto normalizado que el caller puede usar para decidir
// si muestra toast, redirige al login, reintenta, etc.

/**
 * @typedef {Object} NormalizedError
 * @property {string} message - Mensaje legible en español, listo para mostrar.
 * @property {string|null} code - Código de error original (Postgres, PostgREST, etc.).
 * @property {string|null} rawMessage - Mensaje crudo de Supabase (para logs).
 * @property {boolean} isNetwork - true si fue un fallo de red sin respuesta del server.
 * @property {boolean} isAuth - true si la sesión expiró o no hay permisos.
 * @property {boolean} isUnique - true si fue unique_violation (23505).
 * @property {boolean} isFK - true si fue foreign_key_violation (23503).
 * @property {boolean} isPrivilege - true si fue insufficient_privilege (42501).
 * @property {boolean} isNotFound - true si no se encontró el registro (PGRST116).
 */

/**
 * Normaliza un error y devuelve un mensaje contextual.
 * @param {any} error - Error capturado (de Supabase, fetch, etc.).
 * @param {string} [contexto] - Acción que se intentaba (ej: "guardar producto").
 * @returns {NormalizedError|null}
 */
export function handleSupabaseError(error, contexto = "operación") {
    if (!error) return null;

    // Algunos errores vienen envueltos (e.g. `error.cause` o `error.originalError`).
    const raw = error;
    const code = raw?.code || raw?.status || null;
    const rawMessage =
        raw?.message || raw?.error_description || String(raw) || "";

    // ── Detección de tipo ─────────────────────────────────────────
    const isNetwork = esErrorDeRed(raw, rawMessage);
    const isAuth = esErrorDeAuth(code, rawMessage);
    const isUnique = code === "23505";
    const isFK = code === "23503";
    const isPrivilege = code === "42501";
    const isNotFound = code === "PGRST116";

    // ── Mensaje final ────────────────────────────────────────────
    let message;

    if (isNetwork) {
        message = `No se pudo completar la acción. Revisa tu conexión a internet.`;
    } else if (isAuth) {
        message = `Tu sesión expiró. Vuelve a iniciar sesión.`;
    } else if (isPrivilege) {
        message = `No tienes permisos para ${contexto}.`;
    } else if (isUnique) {
        // Mensaje más específico si el mensaje crudo lo sugiere
        if (/codigo|código/i.test(rawMessage)) {
            message = `No se pudo ${contexto}. Ya existe un producto con ese código.`;
        } else {
            message = `No se pudo ${contexto}. El registro ya existe.`;
        }
    } else if (isFK) {
        message = `No se pudo ${contexto}. El registro está siendo usado en otros movimientos.`;
    } else if (isNotFound) {
        message = `No se encontró el registro solicitado al ${contexto}.`;
    } else if (rawMessage) {
        // Errores custom del backend (ej: "Stock insuficiente" del trigger SQL)
        // Si el mensaje tiene contenido útil, lo usamos capitalizado.
        message = capitalizar(rawMessage);
    } else {
        message = `No se pudo ${contexto}. Inténtalo de nuevo.`;
    }

    return {
        message,
        code: code ? String(code) : null,
        rawMessage: rawMessage || null,
        isNetwork,
        isAuth,
        isUnique,
        isFK,
        isPrivilege,
        isNotFound,
    };
}

/** Detecta si la excepción es de red (sin respuesta HTTP). */
function esErrorDeRed(error, message) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return true;
    }
    const texto = `${error?.name || ""} ${message || ""}`.toLowerCase();
    return (
        texto.includes("failed to fetch") ||
        texto.includes("networkerror") ||
        texto.includes("network request failed") ||
        texto.includes("load failed") ||
        texto.includes("aborterror") ||
        error?.name === "AbortError" ||
        // fetch TypeError genérico
        (error instanceof TypeError && !error?.message?.includes("JWT"))
    );
}

/** Detecta si el error indica sesión expirada o sin permisos. */
function esErrorDeAuth(code, message) {
    if (code === 401 || code === 403) return true;
    const texto = (message || "").toLowerCase();
    return (
        texto.includes("jwt") ||
        texto.includes("invalid token") ||
        texto.includes("token expired") ||
        texto.includes("session expired") ||
        texto.includes("not authenticated") ||
        texto.includes("unauthorized")
    );
}

/** Helper de compatibilidad: ¿es un error de auth? */
export function isAuthError(error) {
    if (!error) return false;
    return esErrorDeAuth(error?.code, error?.message || error?.rawMessage);
}

/** Capitaliza la primera letra de un mensaje. */
function capitalizar(texto) {
    if (!texto) return texto;
    const t = String(texto).trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
}
