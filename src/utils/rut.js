export function normalizarRut(value) {
    return String(value ?? "")
        .replace(/[^0-9kK]/g, "")
        .toUpperCase()
        .slice(0, 9);
}

export function formatearRut(value) {
    const rutLimpio = normalizarRut(value);

    if (rutLimpio.length <= 1) return rutLimpio;

    const cuerpo = rutLimpio.slice(0, -1);
    const digitoVerificador = rutLimpio.slice(-1);
    const cuerpoConPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    return `${cuerpoConPuntos}-${digitoVerificador}`;
}
