-- =============================================================
--  FIX: convertir stock_actual de VISTA a TABLA
--  y dejarla sincronizada con los movimientos
--
--  Antes: stock_actual era una VIEW con GROUP BY (no updatable)
--  Ahora: stock_actual es una TABLE mantenida por triggers
-- =============================================================

-- 0) Detectar tipo de productos.id y crear la tabla stock_actual
--    si todavía no existe como tabla.
DO $$
DECLARE
    obj_kind text;        -- 'r' = tabla, 'v' = vista
    id_type text;         -- tipo de productos.id (uuid, bigint, etc.)
BEGIN
    -- ¿Qué es stock_actual hoy?
    SELECT c.relkind INTO obj_kind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'stock_actual' AND n.nspname = 'public';

    -- ¿Qué tipo tiene productos.id?
    SELECT data_type INTO id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'productos'
      AND column_name  = 'id';

    -- Si era una vista, la eliminamos
    IF obj_kind = 'v' THEN
        EXECUTE 'DROP VIEW stock_actual CASCADE';
        RAISE NOTICE 'stock_actual era una vista y fue eliminada';
    END IF;

    -- Crear la tabla con el tipo correcto de id
    -- %s (no %I) para que no le ponga comillas al tipo de dato
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS stock_actual (
            id %s PRIMARY KEY,
            codigo text,
            nombre text,
            stock integer NOT NULL DEFAULT 0
        )',
        id_type
    );
    RAISE NOTICE 'stock_actual lista como tabla (id tipo: %)', id_type;
END $$;

-- 1) MIGRACIÓN INICIAL
--    Para cada producto, suma las entradas y resta las salidas.
INSERT INTO stock_actual (id, codigo, nombre, stock)
SELECT
    p.id,
    p.codigo,
    p.nombre,
    COALESCE(SUM(
        CASE
            WHEN m.tipo_movimiento = 'entrada'  THEN  m.cantidad
            WHEN m.tipo_movimiento = 'salida'   THEN -m.cantidad
            ELSE 0
        END
    ), 0)::int AS stock
FROM productos p
LEFT JOIN movimientos m ON m.producto_id = p.id
GROUP BY p.id, p.codigo, p.nombre
ON CONFLICT (id) DO UPDATE
    SET stock = EXCLUDED.stock;

-- 2) FUNCIÓN: actualiza stock_actual cuando se inserta un movimiento
CREATE OR REPLACE FUNCTION actualizar_stock_actual()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tipo_movimiento = 'entrada' THEN
        INSERT INTO stock_actual (id, stock)
        VALUES (NEW.producto_id, NEW.cantidad)
        ON CONFLICT (id)
        DO UPDATE SET stock = stock_actual.stock + NEW.cantidad;

    ELSIF NEW.tipo_movimiento = 'salida' THEN
        UPDATE stock_actual
        SET stock = stock - NEW.cantidad
        WHERE id = NEW.producto_id
          AND stock >= NEW.cantidad;

        IF NOT FOUND THEN
            RAISE EXCEPTION
                'Stock insuficiente para producto % (solicitado: %)',
                NEW.producto_id, NEW.cantidad
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) TRIGGER en movimientos
DROP TRIGGER IF EXISTS trigger_actualizar_stock ON movimientos;
CREATE TRIGGER trigger_actualizar_stock
    AFTER INSERT ON movimientos
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_stock_actual();

-- 4) FUNCIÓN: sincroniza codigo/nombre en stock_actual
CREATE OR REPLACE FUNCTION sync_producto_to_stock()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO stock_actual (id, codigo, nombre, stock)
    VALUES (NEW.id, NEW.codigo, NEW.nombre, 0)
    ON CONFLICT (id) DO UPDATE
        SET codigo = NEW.codigo,
            nombre = NEW.nombre;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5) TRIGGER en productos
DROP TRIGGER IF EXISTS trigger_sync_producto ON productos;
CREATE TRIGGER trigger_sync_producto
    AFTER INSERT OR UPDATE ON productos
    FOR EACH ROW
    EXECUTE FUNCTION sync_producto_to_stock();
