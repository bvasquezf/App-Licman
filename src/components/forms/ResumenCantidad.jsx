import { cantidadBodega, esLitro } from '../../lib/bodegaUtils';
export default function ResumenCantidad({ producto, cantidad, stock, entrada = false }) {
    if (!producto) return null;
    const litros = esLitro(producto.unidad);
    const saldo = Number(stock) + (entrada ? 1 : -1) * (Number(cantidad) || 0);
    return <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200" aria-live="polite">
        <p className="font-semibold">{litros ? 'Control por litros' : `Unidad de control: ${producto.unidad || 'sin definir'}`}</p>
        {litros && <p className="mt-1">Registra los litros reales, no la cantidad de bidones. Ejemplo: medio litro = 0,5 L.</p>}
        {stock != null && <p className="mt-2">Saldo estimado en bodega: <strong>{cantidadBodega(saldo, producto.unidad)}</strong></p>}
        {stock != null && saldo >= 0 && saldo <= Number(producto.stock_minimo || 0) && <p className="mt-2 font-semibold text-amber-700 dark:text-amber-300">Quedará en el mínimo o por debajo: avisar para compra.</p>}
        <p className="mt-1 text-xs">Mínimo de reposición: {cantidadBodega(producto.stock_minimo, producto.unidad)}.</p>
    </div>;
}
