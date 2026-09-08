# Requerimientos y tareas

El módulo permite registrar un requerimiento apenas llega, aunque todavía no
existan técnicos creados o no se haya acordado una fecha. En ese caso queda en
estado **Por programar** y aparece en la bandeja **Requerimientos** con una alerta
que indica si falta fecha, técnico o ambos.

## Flujo operativo

1. Un usuario con permiso `tareas.planificar` elige **Nuevo requerimiento**.
2. Registra el trabajo solicitado, su categoría, prioridad, origen y cliente.
3. Puede guardarlo de inmediato o abrir **Agregar planificación y detalles**.
4. Cuando el requerimiento tiene fecha y al menos un técnico, el sistema lo
   cambia automáticamente a **Programada**.
5. El técnico lo ve en **Mis tareas** y puede iniciarlo, dejarlo en espera con
   motivo o finalizarlo con resultado.

Las categorías disponibles cubren visitas técnicas, reparaciones en terreno,
retiros para taller, trabajos de taller, despachos de arriendo, retiros al
finalizar un arriendo, mantenciones preventivas y otros requerimientos. El campo
**Referencia de origen** sirve para guardar el asunto de un correo, una orden de
compra o un folio entregado por el cliente.

## Acceso por rol

- `tareas.usar`: consulta Hoy, Requerimientos, Calendario, Semana, Por técnico,
  Tablero, Finalizadas y Pantalla TV.
- `tareas.planificar`: además crea, asigna y edita requerimientos.
- `tareas.ejecutar_propias`: permite al técnico operar las tareas asignadas a su
  cuenta desde Mis tareas.
- `tareas.eliminar`: permite usar la Papelera.

Todas las personas deben iniciar sesión. El permiso de lectura no permite crear,
editar ni reasignar trabajo.

## Base de datos

Antes de usar el formulario actualizado se debe aplicar
`supabase/migrations/048_requerimientos_tareas.sql` en el proyecto Supabase. La
migración agrega los campos de clasificación y el RPC
`guardar_requerimiento_tarea`. Es aditiva e idempotente; conserva las tareas y el
historial existentes.

La prueba SQL local se ejecuta con:

```bash
BODEGA_PGLITE_MODULE=/private/tmp/licman-bodega-sql-check/node_modules/@electric-sql/pglite/dist/index.js node supabase/tests/tareas-requerimientos.mjs supabase/migrations/048_requerimientos_tareas.sql
```
