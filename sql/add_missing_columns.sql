-- =============================================================
--  SQL consolidado: agregar TODAS las columnas que faltan
--  para que la app funcione sin errores PGRST204
--  Es idempotente, se puede correr varias veces
-- =============================================================

-- 1) Columna para clasificar el porqué del movimiento
ALTER TABLE movimientos
ADD COLUMN IF NOT EXISTS motivo_movimiento text;

-- 2) Columna para el tipo de documento (factura/boleta/guía/otro)
ALTER TABLE movimientos
ADD COLUMN IF NOT EXISTS tipo_documento text;

-- 3) Refrescar caché de PostgREST
NOTIFY pgrst, 'reload schema';

-- 4) Verificación: listar TODAS las columnas de movimientos
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'movimientos'
ORDER BY ordinal_position;
