-- =============================================================
--  DEBUG: verificar que motivo_movimiento exista y refrescar cache
-- =============================================================

-- 1) Confirmar que la columna EXISTE en la DB
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'movimientos'
  AND column_name = 'motivo_movimiento';

-- 2) Si la query anterior NO devuelve filas, la columna no existe.
--    En ese caso, corré esto:
-- ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS motivo_movimiento text;

-- 3) Refrescar el cache de PostgREST (forma 1: NOTIFY)
NOTIFY pgrst, 'reload schema';

-- 4) Forma 2: a veces el NOTIFY solo no alcanza. Esperá unos segundos
--    y verificá que la API ya lo ve con esta query:
SELECT * FROM movimientos LIMIT 0;
-- (debería devolver la estructura con todas las columnas,
--  incluida motivo_movimiento)
