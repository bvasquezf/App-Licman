-- =============================================================
--  AGREGAR motivo_movimiento a movimientos
--  (versión reforzada que confirma cada paso)
-- =============================================================

-- 1) Agregar la columna (idempotente)
ALTER TABLE movimientos
ADD COLUMN IF NOT EXISTS motivo_movimiento text;

-- 2) Confirmar inmediatamente que se creó
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'movimientos'
  AND column_name = 'motivo_movimiento';
-- ^ Esta query DEBE devolver 1 fila con motivo_movimiento

-- 3) Refrescar el caché de PostgREST
NOTIFY pgrst, 'reload schema';

-- 4) Verificación final
SELECT * FROM movimientos LIMIT 0;
-- ^ Debe mostrar todas las columnas, incluida motivo_movimiento
