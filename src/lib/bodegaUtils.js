export function esUnidadEntera(unidad) {
    return ['unidad', 'unidades', 'un', 'u', 'pieza', 'piezas'].includes(String(unidad ?? '').trim().toLowerCase());
}
export function esLitro(unidad) {
    return ['l', 'lt', 'lts', 'litro', 'litros'].includes(String(unidad ?? '').trim().toLowerCase());
}
export function cantidadBodega(cantidad, unidad = '') {
    return `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 3 }).format(Number(cantidad) || 0)}${unidad ? ` ${unidad}` : ''}`;
}
export function validarCantidad(cantidad, unidad) {
    const n = Number(cantidad);
    if (!Number.isFinite(n) || n <= 0) return 'Ingresa una cantidad mayor que cero';
    if (Math.abs(n * 1000 - Math.round(n * 1000)) > 0.000001) return 'Usa hasta 3 decimales';
    if (esUnidadEntera(unidad) && !Number.isInteger(n)) return 'Este producto se retira por unidades enteras';
    return '';
}
export function stockConProductos(productos, stock) {
    const mapa = new Map(stock.map((s) => [String(s.id), s]));
    return productos.filter((p) => p.activo).map((p) => ({ ...p, stock: Number(mapa.get(String(p.id))?.stock ?? 0) }));
}
