-- =============================================================
--  TEST: verificar triggers de stock_actual
--  Copy-paste y listo (no hay que tocar nada)
-- =============================================================

-- 1) Ver columnas reales de la tabla movimientos
--    (para confirmar qué campos existen antes de probar)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'movimientos'
ORDER BY ordinal_position;

-- 2) Ver los 3 primeros productos con su stock actual
SELECT id, codigo, nombre, stock
FROM stock_actual
ORDER BY id
LIMIT 3;

-- 3) Test de entrada: agarra el PRIMER producto y súmale 10
--    (después del test, podés volver a ver el stock con la query 2)
DO $$
DECLARE
    primer_producto_id bigint;
    stock_antes integer;
    stock_despues integer;
BEGIN
    -- Tomamos el primer producto
    SELECT id INTO primer_producto_id FROM stock_actual ORDER BY id LIMIT 1;
    SELECT stock INTO stock_antes FROM stock_actual WHERE id = primer_producto_id;

    RAISE NOTICE '=== TEST 1: ENTRADA ===';
    RAISE NOTICE 'Producto: % | Stock antes: %', primer_producto_id, stock_antes;

    -- Insertamos una entrada (sin motivo_movimiento por si no existe)
    INSERT INTO movimientos (producto_id, tipo_movimiento, cantidad)
    VALUES (primer_producto_id, 'entrada', 10);

    -- Verificamos
    SELECT stock INTO stock_despues FROM stock_actual WHERE id = primer_producto_id;
    RAISE NOTICE 'Stock después: % | Esperado: %', stock_despues, stock_antes + 10;

    IF stock_despues = stock_antes + 10 THEN
        RAISE NOTICE '✓ ENTRADA OK';
    ELSE
        RAISE NOTICE '✗ ENTRADA FALLÓ';
    END IF;
END $$;

-- 4) Test de salida: restamos 3 al mismo producto
DO $$
DECLARE
    primer_producto_id bigint;
    stock_antes integer;
    stock_despues integer;
BEGIN
    SELECT id INTO primer_producto_id FROM stock_actual ORDER BY id LIMIT 1;
    SELECT stock INTO stock_antes FROM stock_actual WHERE id = primer_producto_id;

    RAISE NOTICE '=== TEST 2: SALIDA ===';
    RAISE NOTICE 'Producto: % | Stock antes: %', primer_producto_id, stock_antes;

    INSERT INTO movimientos (producto_id, tipo_movimiento, cantidad)
    VALUES (primer_producto_id, 'salida', 3);

    SELECT stock INTO stock_despues FROM stock_actual WHERE id = primer_producto_id;
    RAISE NOTICE 'Stock después: % | Esperado: %', stock_despues, stock_antes - 3;

    IF stock_despues = stock_antes - 3 THEN
        RAISE NOTICE '✓ SALIDA OK';
    ELSE
        RAISE NOTICE '✗ SALIDA FALLÓ';
    END IF;
END $$;

-- 5) Test de salida sin stock: debe FALLAR
DO $$
DECLARE
    primer_producto_id bigint;
BEGIN
    -- Re-declaramos la variable localmente porque cada DO block es independiente
    SELECT id INTO primer_producto_id FROM stock_actual ORDER BY id LIMIT 1;

    RAISE NOTICE '=== TEST 3: SALIDA SIN STOCK (debe fallar) ===';
    RAISE NOTICE 'Producto a probar: %', primer_producto_id;

    INSERT INTO movimientos (producto_id, tipo_movimiento, cantidad)
    VALUES (primer_producto_id, 'salida', 999999);
    RAISE NOTICE '✗ NO DEBERÍA HABER LLEGADO ACÁ';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✓ BLOQUEÓ LA SALIDA CORRECTAMENTE: %', SQLERRM;
END $$;
