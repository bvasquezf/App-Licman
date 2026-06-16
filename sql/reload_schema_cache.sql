-- =============================================================
--  Refrescar el schema cache de PostgREST
--
--  Después de agregar/modificar columnas con SQL directo,
--  PostgREST (la API de Supabase) puede no enterarse hasta
--  que se le avise explícitamente. Esta línea lo arregla.
-- =============================================================

NOTIFY pgrst, 'reload schema';
