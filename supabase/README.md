# Arquitectura del backend

La aplicación utiliza Supabase como backend administrado. La infraestructura
operativa se mantiene en un repositorio privado separado; este repositorio
público contiene únicamente el cliente web y este resumen arquitectónico.

## Componentes

- PostgreSQL y PostgREST para inventario, movimientos y planificación.
- Supabase Auth con perfiles y permisos por módulo.
- Row Level Security como control de acceso principal en la base de datos.
- Storage privado para fotografías, servido mediante URLs firmadas.
- Operaciones transaccionales para movimientos de equipos, baterías y tareas.
- Auditoría de autoría vinculada al usuario autenticado.

## Dominios funcionales

- Inventario y movimientos de repuestos de bodega.
- Equipos distribuidos entre bodegas y clientes.
- Inventario y asociación de baterías eléctricas.
- Mantenimiento, planificación de tareas y carga de técnicos.

Por seguridad y separación de responsabilidades, las credenciales, migraciones
SQL, políticas RLS y funciones administrativas no forman parte de la
distribución pública.
