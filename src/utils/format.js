// Utilidades de formato compartidas (fechas y moneda, es-CL).

/** $1.234.567 — CLP sin decimales. */
export function formatCLP(value) {
    return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
    }).format(value || 0);
}

/** "15/03/2026 14:30" — fecha y hora. */
export function formatearFecha(iso) {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        return d.toLocaleString("es-CL", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return iso;
    }
}

/** "15/03/26" — solo fecha, año corto. */
export function formatearFechaCorta(iso) {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        return d.toLocaleDateString("es-CL", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
        });
    } catch {
        return iso;
    }
}
