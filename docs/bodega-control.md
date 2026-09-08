# Bodega: revisión y control operativo

Implementación local del 8 de septiembre de 2026. Requiere la migración privada `046_bodega_control_operativo.sql` después de 045. No se ha aplicado a Supabase ni publicado en Netlify.

## Corrección del acceso de superadministrador

Si solo aparecen Resumen, Stock actual y Por comprar, la sesión no recibió las cinco capacidades operativas nuevas. No basta con publicar el frontend.

1. Completar `046_bodega_control_operativo.sql` si aún no se aplicó (validación indicada abajo).
2. Ejecutar `047_superadmin_permisos_nuevos.sql`. Reasigna al superadministrador todos los permisos existentes y agrega automáticamente los futuros. Si falta 046, aborta con una explicación antes de modificar datos.
3. Volver a Bodega y pulsar **Actualizar mi acceso**, o cerrar y abrir sesión.

El superadministrador tendrá Crear / editar productos, Ingresar compra, Retirar productos, Devoluciones e Historial, además de las tres vistas de consulta. El técnico tendrá consulta, Retirar productos y Devoluciones propias. No se simulan permisos en React: las rutas y escrituras siguen dependiendo de la autorización del servidor.

Validado en PostgreSQL de prueba: 047 repetible, seis capacidades de Bodega para superadmin y herencia de un permiso nuevo sin otorgárselo al técnico.

## Hallazgos y cambios

| Área | Problema encontrado | Cambio |
|---|---|---|
| Permisos | `bodega.usar` permitía todas las acciones, incluso compras y cambios de catálogo | Capacidades separadas en rutas, navegación, editor de roles, RLS y funciones SQL |
| Retiros | Solicitante libre y destino opcional | Solicitante fijado a la cuenta, destino/OT obligatorio y referencia opcional del recipiente |
| Líquidos | Inputs con paso entero implícito | Cantidades de hasta 3 decimales, unidad visible y saldo estimado; unidades/piezas exigen enteros |
| Devoluciones | Ingreso sin conexión con la salida | Página propia, retiro original, devolución parcial y límite validado en servidor |
| Reposición | Productos sin fila de stock podían quedar fuera | Catálogo activo combinado con stock; ausencia equivale a cero; página Por comprar |
| Consultas | Sin paginación explícita; riesgo de truncamiento por Supabase | Catálogo completo por lotes y movimientos de 50 en 50 con filtros de fecha/tipo en servidor |
| Reintentos | Inserción directa de movimientos podía duplicarse | RPC con token de operación y bloqueo; se conserva el token al reintentar el mismo formulario |
| Catálogo | Unidad modificable aunque reinterpretara movimientos históricos | Servidor impide cambiar unidad con historial y desactivar productos con stock distinto de cero |
| Presentación | Sin flujo directo entre alertas y compras; confirmación nativa para desactivar | Accesos rápidos, compra preseleccionada desde reposición y diálogo existente del sistema |

## Permisos predeterminados

| Rol | Existencias/resumen/reposición | Retirar | Devolver | Catálogo | Compras/ingresos | Historial completo |
|---|---|---|---|---|---|---|
| Administrador / Superadministrador / Supervisor / Bodega | Sí | Sí | Cualquier retiro | Sí | Sí | Sí |
| Técnico / Técnico de logística de equipos | Sí | Sí | Retiros propios | No | No | No |
| Otros roles | Según asignación explícita | Según permiso | Según permiso | Según permiso | Según permiso | Según permiso |

Los roles personalizados con el permiso antiguo conservan consulta; deben recibir explícitamente las capacidades nuevas. El editor agrega el permiso base al seleccionar una capacidad. La BD también comprueba la dependencia. La migración no elimina asignaciones personalizadas de otros módulos.

## Uso diario

1. Crear el producto con su unidad de control y stock mínimo. Para aceite/electrolito usar `litro`, nunca mezclar litros con bidones bajo la misma ficha.
2. Ingresar la compra por el volumen total recibido, con precio **por litro**, proveedor y documento. Ejemplo: un bidón de 200 L se registra como 200 litros.
3. El técnico retira la cantidad real entregada a su tarro, por ejemplo 2,5 L. Puede identificarlo como “Tarro Juan · capacidad 5 L”. El servidor registra la cuenta real y exige destino/OT.
4. Bodega queda en 197,5 L. Si el técnico devuelve 0,75 L aptos para stock, selecciona el retiro y registra esa cantidad: quedan 198,25 L.
5. Cuando el saldo es menor o igual al mínimo, aparece en las alertas y en **Por comprar**. Son alertas dentro de la app, sin correo, WhatsApp ni avisos push.

El sistema mantiene el total de cada producto en bodega. No mantiene un saldo físico independiente por bidón grande ni mide el consumo posterior del tarro del técnico. “Puedes devolver hasta” significa retiro menos devoluciones, no que ese material siga en poder del técnico: puede haberse consumido. No se obliga a devolver material consumido.

El umbral de reposición no es un objetivo de compra. “Falta para mínimo” sirve de referencia; comprar exactamente esa diferencia puede dejar el producto todavía en alerta.

## Verificación realizada

- ESLint: sin errores; advertencias preexistentes de Fast Refresh en contextos.
- Pruebas de funciones de cantidades y catálogo: `node --test tests/bodega-utils.test.mjs`.
- PostgreSQL local temporal con PGlite: migración aplicada dos veces, columnas enteras convertidas a numeric, compra, retiro de 2,5 L, devolución de 0,75 L, stock resultante, autoría, políticas con usuarios distintos, intentos de compra por técnico, devolución ajena/excesiva/sin retiro, escritura directa, repetición del token y bloqueo de cambio de unidad histórica.
- Transformación con Vite de las pantallas/componentes modificados. No se ejecutó `npm run build`, según las instrucciones del proyecto.
- Sin navegador conectado: queda pendiente la inspección visual en iPhone/Mac y la interacción autenticada con datos reales.

Las pruebas SQL usan una estructura de prueba y triggers de stock de prueba. La definición original de los triggers de Bodega no está en las migraciones del repositorio. Por tanto, no demuestran todavía compatibilidad con esos triggers en producción.

Repetir la prueba privada (herramienta temporal; no agrega dependencias a la app):

```sh
BODEGA_PGLITE_MODULE=/private/tmp/licman-bodega-sql-check/node_modules/@electric-sql/pglite/dist/index.js node supabase/tests/bodega-control.mjs supabase/migrations/046_bodega_control_operativo.sql
```

## Antes de activar

1. Ejecutar `supabase/diagnostico_bodega.sql` en una copia de la base real. Revisar particularmente variables `integer`, conversiones y redondeos dentro de los triggers de stock, además de restricciones de motivos.
2. Aplicar 046 en esa copia. La conversión de columnas no redondea datos históricos; PostgreSQL aborta la transacción si encuentra una vista dependiente incompatible. Resolver esa dependencia explícitamente, sin borrar vistas automáticamente.
3. Repetir el flujo 200 → 197,5 → 198,25 L con los triggers reales. Probar dos retiros simultáneos del último saldo: solo debe aprobarse el que cabe. Probar dos devoluciones simultáneas que juntas excedan lo retirado.
4. Con cuentas Técnico y Administrador, verificar las pestañas visibles y el acceso directo por URL. Revisar modo claro/oscuro, ancho de iPhone, teclado, foco y cierre del diálogo de devolución.
5. Aplicar la migración validada antes de publicar el frontend y refrescar sesión/permisos. **El frontend nuevo requiere 046**: no publicarlo con la BD anterior.
6. El usuario ejecuta `npm run build` y despliega mediante su flujo habitual.

El directorio `supabase/` está ignorado intencionalmente por Git. La migración, diagnóstico y prueba SQL quedan locales y deben gestionarse por el canal privado existente; un push a GitHub no los publica ni ejecuta.

## Límites que permanecen

- La creación de producto y su stock inicial conserva el flujo de dos operaciones existente. Si falla el stock inicial, el producto queda creado y la UI pide ingresar el stock desde Nueva entrada. No se vuelve a crear el producto automáticamente.
- El token de reintento de un movimiento vive mientras el formulario está montado; no es una cola offline persistente. Tras recargar, comprobar el historial antes de repetir una operación cuya respuesta se perdió.
- El historial y su Excel contienen la página actual (hasta 50 registros); el texto lo indica. Fecha y tipo buscan en la BD; texto busca dentro de esa página. El reporte del resumen contiene solo los cinco movimientos recientes visibles.
- No se añade conteo físico con ajuste negativo, control de mermas ni saldos individuales por recipiente. Conviene tratarlos como un flujo administrativo de conciliación posterior, con evidencia y motivos propios, sin inventar devoluciones para cuadrar diferencias.
