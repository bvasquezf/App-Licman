import test from 'node:test';
import assert from 'node:assert/strict';
import { validarCantidad, cantidadBodega, stockConProductos, esLitro } from '../src/lib/bodegaUtils.js';

test('retiros fraccionados en litros y unidades enteras', () => {
    assert.equal(validarCantidad(2.5, 'litro'), '');
    assert.equal(validarCantidad(0.125, 'L'), '');
    for (const n of [0, -1, Infinity, NaN, 0.0001]) assert.notEqual(validarCantidad(n, 'litro'), '');
    assert.notEqual(validarCantidad(0.5, 'unidad'), '');
    assert.equal(validarCantidad(2, 'unidad'), '');
    assert.equal(esLitro(' LITROS '), true);
    assert.equal(cantidadBodega(197.5, 'L'), '197,5 L');
});
test('reposicion incluye productos sin fila de stock y excluye inactivos', () => {
    const stock = stockConProductos([{ id: 1, activo: true }, { id: 2, activo: true }, { id: 3, activo: false }], [{ id: '1', stock: '197.5' }]);
    assert.deepEqual(stock.map(({ id, stock }) => ({ id, stock })), [{ id: 1, stock: 197.5 }, { id: 2, stock: 0 }]);
});
