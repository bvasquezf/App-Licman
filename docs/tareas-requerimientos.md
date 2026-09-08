# Requerimientos y tareas

El módulo permite registrar un requerimiento apenas llega, aunque todavía no
existan técnicos creados o no se haya acordado una fecha. En ese caso queda en
estado **Por programar** y aparece en la bandeja **Requerimientos** con una alerta
que indica si falta fecha, técnico o identificar el equipo.

## Flujo operativo

1. Un usuario con permiso `tareas.planificar` elige **Nuevo requerimiento**.
2. Registra el trabajo solicitado, su categoría, prioridad, origen, cliente y
   la propiedad del equipo.
3. Puede guardarlo de inmediato o abrir **Agregar planificación y detalles**.
4. Cuando el requerimiento tiene fecha, al menos un técnico y el equipo está
   identificado, el sistema lo cambia automáticamente a **Programada**.
5. El técnico lo ve en **Mis tareas** y puede iniciarlo, dejarlo en espera con
   motivo o finalizarlo con resultado.

Las categorías disponibles cubren visitas técnicas, reparaciones en terreno,
retiros para taller, trabajos de taller, despachos de arriendo, retiros al
finalizar un arriendo, mantenciones preventivas y otros requerimientos. El campo
**Referencia de origen** sirve para guardar el asunto de un correo, una orden de
compra o un folio entregado por el cliente.

## Identificación del equipo

Cada requerimiento debe quedar en una de estas cuatro situaciones:

- **Equipo Licman:** se selecciona desde el inventario existente y mantiene su
  vínculo mediante `equipo_id`.
- **Equipo del cliente:** guarda tipo, marca, modelo, serie y condición de
  recepción dentro de la tarea; no crea registros en el inventario Licman.
- **Por confirmar:** permite registrar la solicitud apenas llega, pero la tarea
  permanece **Por programar** hasta aclarar el equipo.
- **Sin equipo:** se usa para gestiones o trabajos que no involucran un equipo
  específico y sí permite completar la planificación.

Las tarjetas y el detalle muestran una insignia con la propiedad. Los filtros
permiten separar rápidamente equipos Licman, equipos de clientes, pendientes de
confirmación y tareas sin equipo. Al seleccionar un equipo Licman se conserva su
`equipo_id`; el historial del módulo Equipos puede mostrar después los trabajos
de Tareas asociados a ese mismo equipo.

## Acceso por rol

- `tareas.usar`: habilita el módulo y la consulta de datos.
- `tareas.planificar`: permite usar Inicio, Requerimientos, Calendario, Por
  técnico, Finalizadas y Pantalla TV; además crea, asigna y edita requerimientos.
- `tareas.ejecutar_propias`: permite al técnico operar las tareas asignadas a su
  cuenta desde Mis tareas.
- `tareas.eliminar`: permite usar la Papelera.

Todas las personas deben iniciar sesión. El Técnico ve solamente **Mis tareas**
en la barra del módulo; allí opera los trabajos asignados a su propia cuenta.

## Base de datos

Antes de usar el formulario actualizado se deben aplicar, en orden, las
migraciones `048_requerimientos_tareas.sql`, `049_propiedad_equipos_tareas.sql`
y `050_historial_tareas_equipos.sql` en el proyecto Supabase. La tercera agrega
la relación con el inventario y el RPC `listar_historial_tareas_equipo`. Son
aditivas e idempotentes; conservan las tareas y el historial existentes.

La prueba SQL local se ejecuta con:

```bash
BODEGA_PGLITE_MODULE=/private/tmp/licman-bodega-sql-check/node_modules/@electric-sql/pglite/dist/index.js node supabase/tests/tareas-requerimientos.mjs supabase/migrations/048_requerimientos_tareas.sql supabase/migrations/049_propiedad_equipos_tareas.sql supabase/migrations/050_historial_tareas_equipos.sql
```
