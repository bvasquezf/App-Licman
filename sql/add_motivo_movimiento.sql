-- =============================================================
--  AGREGAR columna motivo_movimiento a la tabla movimientos
--  Se necesita para clasificar el "porqué" de cada movimiento
--  (compra, stock_inicial, ajuste, devolución, etc.)
-- =============================================================

ALTER TABLE movimientos
ADD COLUMN IF NOT EXISTS motivo_movimiento text;

-- (Opcional) Verificar que se agregó
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'movimientos'
ORDER BY ordinal_position;
