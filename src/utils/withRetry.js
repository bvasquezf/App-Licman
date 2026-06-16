// Reintenta UNA vez una función async si falla con un error transitorio
// (red, 5xx, 429). NO reintenta errores lógicos (unique_violation, FK, etc).

/**
 * @param {() => Promise<any>} fn - Función async a ejecutar.
 * @param {Object} [options]
 * @param {number} [options.delayMs=500] - Espera antes del reintento.
 * @param {() => void} [options.onRetry] - Callback antes de reintentar (para UI).
 * @returns {Promise<any>}
 */
export async function withRetry(fn, { delayMs = 500, onRetry } = {}) {
    try {
        return await fn();
    } catch (err) {
        if (!esTransitorio(err)) throw err;
        onRetry?.();
        await esperar(delayMs);
        return await fn(); // si vuelve a fallar, propaga el error
    }
}

function esperar(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Determina si un error es transitorio (merece reintento). */
function esTransitorio(err) {
    if (!err) return false;

    // Errores de red → siempre transitorios
    const texto = `${err?.name || ""} ${err?.message || ""}`.toLowerCase();
    if (
        texto.includes("failed to fetch") ||
        texto.includes("networkerror") ||
        texto.includes("network request failed") ||
        texto.includes("load failed") ||
        err?.name === "AbortError" ||
        (err instanceof TypeError)
    ) {
        return true;
    }

    // HTTP 5xx o 429 (rate limit) → transitorios
    const status = err?.status || err?.code;
    if (status === 429) return true;
    if (typeof status === "number" && status >= 500 && status < 600) {
        return true;
    }

    // Errores lógicos de Postgres → NUNCA transitorios
    if (status === "23505" || status === "23503" || status === "23514") {
        return false;
    }

    return false;
}
