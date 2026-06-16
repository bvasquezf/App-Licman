-- =============================================================
--  AGREGAR tipo_documento a movimientos
--  (para que el form pueda registrar factura/boleta/guía/etc)
-- =============================================================

ALTER TABLE movimientos
ADD COLUMN IF NOT EXISTS tipo_documento text;

-- Confirmar
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'movimientos'
  AND column_name = 'tipo_documento';

-- Refrescar caché
NOTIFY pgrst, 'reload schema';
