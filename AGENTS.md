# Control de Bodega — Guía para Codex

App web unificada de Licman: **4 secciones en una sola SPA** (rama `unificacion-licman`).
En español chileno, usable desde iPhone y MacBook.

1. **Bodega** (`/bodega/*`) — inventario de repuestos/ferretería
2. **Equipos** (`/equipos/*`) — inventario de equipos entre bodegas y clientes, con fotos y papelera
3. **Mantenimiento** (`/mantenimiento/*`) — dashboard de OTs, técnicos, reincidencia y tiempos
4. **Tareas** (`/tareas/*`) — planificación de taller/terreno, calendario y carga por técnico

## Stack

- **React 19.2** + **Vite 8** + **React Router 7**
- **Tailwind CSS 4** con `@tailwindcss/vite` (sin `tailwind.config.js`)
- **Supabase** (PostgreSQL + PostgREST + Storage) — un solo proyecto compartido
- **chart.js** (gráficos mantenimiento, vía wrapper propio `ChartCanvas` — NO usar react-chartjs-2)
- **idb** (IndexedDB: cache de equipos + cola offline)
- **xlsx** para exportar a Excel
- **Sin TypeScript** — todo en JSX plano

## Estructura del proyecto

```
src/
├── pages/              # Sección BODEGA: Dashboard, Productos, StockActual,
│                       #   NuevaEntrada, NuevaSalida, Historial
├── views/
│   ├── equipos/        # RegistrarEquipoView (alta), InventarioView,
│   │                   #   ClientesView, PapeleraView, ExportarView
│   ├── mantenimiento/  # ResumenView, TecnicosView, ReincidenciaView, TiemposView
│   └── tareas/         # TareasView: tablero, calendario, carga y finalizadas
├── components/
│   ├── forms/          # ProductoForm (wizard 2 pasos), EntradaForm, SalidaForm
│   ├── equipos/        # EquiposHeader, MovimientoDialog, MovimientoHistorialModal,
│   │                   #   InventarioTabla, CrearClienteForm, PhotoUpload, EquipoFoto…
│   ├── mantenimiento/  # DashboardShell, ChartCanvas, KpiCard, DataTable,
│   │                   #   FilterBar, SourceConfigPanel
│   ├── tareas/         # TareaFormDialog, TareaCard, TareasCalendario,
│   │                   #   TareasTablero, CargaTecnicos
│   └── ui/             # PageHeader, StatCard, Card, EmptyState, Skeleton, PillToast
├── context/            # ToastContext (queue FIFO max 4), NetworkContext
│                       #   (online/offline + flush de cola), DashboardContext
│                       #   (solo /mantenimiento: data + filtros + auto-refresh 2 min)
├── hooks/              # useAsync, useCodigoDisponible, useSiguienteCorrelativo,
│                       #   useUnsavedChanges, useModalTransition
├── lib/                # offlineDb (IDB: cache + pendingWrites), offlineQueue (flush),
│                       #   equiposStorage (fotos), compressImage (resize+JPEG en el
│                       #   navegador ANTES de subir: toda foto pasa por ahí, ~300 KB),
│                       #   equiposValidacion, equiposPresentacion, equiposExport,
│                       #   equiposConstants, dashboardData (loadData + circuit breaker),
│                       #   dashboardAnalytics, dashboardPresentation, tareasData
├── services/           # supabase.js (cliente único compartido)
├── shell/              # AppShell (sidebar + topbar mobile), Sidebar, SubNavBar,
│                       #   subNavConfig (secciones y sub-nav por ruta)
├── utils/              # handleSupabaseError, withRetry, productCodeUtils,
│                       #   exportToExcel, exportWorkbook, format (formatCLP,
│                       #   formatearFecha, formatearFechaCorta)
├── App.jsx             # Router protegido por sesión y permisos por módulo
└── main.jsx            # ToastProvider > AuthProvider > NetworkProvider > App
```

## Base de datos (Supabase, proyecto único)

Tablas por sección:

- **Bodega**: `productos`, `stock_actual`, `bodega_movimientos` (antes `movimientos`, renombrada en migración 002)
- **Equipos**: `equipos`, `equipos_bodegas`, `equipos_movimientos`, `clientes`
- **Mantenimiento**: `mantenimiento_ots`, `mantenimiento_informes_terreno`, `mantenimiento_catalogo_clientes`, `mantenimiento_catalogo_tecnicos`
- **Tareas**: `tareas`, `tareas_tecnicos`, `tareas_historial`
- **Auth**: `perfiles`, `roles_app`, `permisos_app`, `roles_permisos_app`

RPCs (siempre vía `supabase.rpc`, nunca escritura directa a equipos):
`insert_equipo`, `soft_delete_equipo`, `restore_equipo`, `hard_delete_equipo`,
`registrar_movimiento` (soporta cliente y swap), `preview_next_correlativo`,
`actualizar_estado_equipo`, `actualizar_foto_equipo`, `actualizar_equipo`, `import_equipo` (solo para la carga inicial desde
`scripts/importar-inventario.mjs`; la app no la usa).
Tareas usa `guardar_tarea_identificada` (guarda requerimiento, propiedad del
equipo, clasificación + asignaciones en transacción) y
`cambiar_estado_tarea` para sus cambios rápidos.
El historial de Equipos consulta `listar_historial_tareas_equipo` para mostrar
los trabajos de Tareas asociados a cada equipo Licman.
Los swaps de equipos usan `registrar_cambio_equipo`, que mueve en una sola
transacción el reemplazante hacia el cliente y el equipo reemplazado a bodega.
Auth/RBAC usa `requiere_configurar_administrador`, `obtener_mi_acceso`, `puede`,
`actualizar_mi_perfil`, `listar_roles_app`, `listar_usuarios_app`,
`actualizar_usuario_app` y `obtener_mi_actividad`.

Migraciones en `supabase/migrations/` (000–050), idempotentes.
046 incorpora permisos granulares de Bodega y movimientos por RPC; requiere validar
los triggers históricos de stock antes de aplicarla (ver `docs/bodega-control.md`).
047 repara permisos del superadministrador y asigna automáticamente capacidades nuevas.
Desde 010 `equipos` tiene además `capacidad_kg`, `mastil`, `anio`, `altura`,
`bateria`, `bateria_serie` (vienen de la planilla de inventario; el formulario
de alta no los edita, pero sí se pueden corregir desde la ficha del inventario).

## Auth y permisos

- Supabase Auth por correo/contraseña, implementado en migración 028.
- `AuthProvider` carga sesión + perfil; `RequireAuth` y `RequirePermission` protegen rutas.
- El primer usuario se vuelve Administrador. Los siguientes se invitan desde `/usuarios`
  mediante la Edge Function `invitar-usuario` y reciben un rol. La eliminación de
  cuentas usa la Edge Function `eliminar-usuario`.
- RLS de tablas y Storage está cerrado para `anon`. Los permisos se comprueban también
  en triggers para cubrir los RPC `SECURITY DEFINER` antiguos.
- Roles por defecto: Administrador, Supervisor, Bodega, Operador de equipos, Técnico,
  Técnico de logística de equipos, Planificador y Sin acceso. Equipos separa lectura,
  alta, edición, traslado, historial, baterías, estado, papelera, clientes y exportación.
- `responsable` sigue siendo el dato operativo; `creado_por = auth.uid()` registra al
  usuario que ingresó realmente el movimiento o cambio.
- Mi perfil (`/perfil`) muestra actividad propia; administración (`/usuarios`) requiere
  `usuarios.gestionar`.
- Sub-nav y rutas de `/tareas` gateadas por permiso granular (subNavConfig +
  `RequirePermission` anidado en App.jsx): las vistas de coordinación requieren
  `tareas.planificar`; `Mis tareas` requiere `tareas.ejecutar_propias`; Papelera
  requiere `tareas.eliminar`. El rol Técnico solo ve "Mis tareas". La sub-nav del
  planificador muestra Inicio, Requerimientos, Calendario, Por técnico,
  Finalizadas y Papelera; Semana, Tablero y Pantalla TV no ocupan una pestaña.
- Bodega separa `bodega.usar`, `bodega.productos`, `bodega.ingresar`,
  `bodega.retirar`, `bodega.devolver` y `bodega.historial`. Técnicos pueden consultar,
  retirar y devolver sus propios retiros. No compran ni editan catálogo.
- Movimientos de Bodega usan `guardar_movimiento_bodega` con token de reintento.
  Devoluciones usan `listar_retiros_bodega` y `retiro_id`; nunca insertar movimientos
  directamente desde la app. Líquidos se controlan en litros (hasta 3 decimales).
- Face ID/Touch ID mediante passkeys queda para después de desplegar un dominio estable.

## Offline (sección Equipos)

- Cache de equipos en IndexedDB (`bodega-licman-equipos`, store `equipos`).
- Cola de mutaciones en store `pendingWrites` (**keyPath `id` + autoIncrement**, DB v2):
  `enqueuePendingWrite` al perder conexión; `flushQueue` (offlineQueue.js) la vuelca
  FIFO al volver la red (lo gatilla NetworkContext). Cada entrada guarda `userId` y no
  se sincroniza bajo una cuenta distinta.
- Fotos y swaps **nunca** se encolan (se bloquean en UI con toast).

## Cache local (sección Tareas)

- `lib/tareasCache.js` (DB `licman-tareas`, store `cache`): cache SWR de las tareas
  operativas. TareasContext muestra el cache altiro al entrar y lo reemplaza cuando
  llega la data fresca; cada carga exitosa lo re-escribe. Amarrado a `userId`
  (no se muestra data de otra cuenta).

## Patrones del proyecto (respetar)

### Carga de datos — siempre con `useAsync`
```jsx
const { data, loading, error, refetch } = useAsync(cargarData, {
    errorContexto: "cargar productos",
    onError: (err) => showToast(err.message, "error"),
});
```
- **NO** usar `useState` + `useEffect` para fetches. Usar `useAsync`.
  (Deuda conocida: InventarioView/RegistrarEquipoView aún usan fetch crudo.)
- Queries a Supabase siempre envueltas en `withRetry(() => ...)`.
- Errores normalizados con `handleSupabaseError(error, contexto).message`.
- `useAsync` retorna solo `{ data, loading, error, refetch }` — NO existe `setData`
  (hubo un ReferenceError por esto en PapeleraView).

### Toasts
```jsx
const toast = useToast();
toast.success("Producto guardado");  // .error | .warning | .info
// API legacy también válida: showToast("msg", "success")
```
- Hasta 4 visibles, FIFO queue. No reinventar.

### Validación de código de producto
```jsx
const { disponible, loading } = useCodigoDisponible(codigo, {
    habilitado: !!codigo,
    excluirId: productoEditar?.id ?? null,  // null en creación
});
```
- Solo aviso visual, **NO bloquea** el submit (la BD es la fuente de verdad).

### Persistencia de forms
```jsx
useUnsavedChanges(formData);
// Modo edición: pasar resetKey para que el snapshot se recapture por registro:
useUnsavedChanges(formData, {
    habilitado: cargadoPara === (productoEditar?.id ?? "nuevo"),
    resetKey: productoEditar?.id ?? "nuevo",
});
```
- Usar en todo form con datos del usuario (ProductoForm, EntradaForm, SalidaForm).
- Los handlers de guardado deben **retornar true/false**: el form solo se limpia
  si retorna true (así no se pierden datos cuando falla, ej: código duplicado).

## Convenciones de UI

### iOS / iPhone (notch, Dynamic Island)
- Safe areas con `max()` inline:
  ```jsx
  style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
  ```
- Touch targets **mínimo 44×44px** (`h-11 w-11` o `min-h-[44px]`).
- **NUNCA** usar `text-[10px]` ni `text-[11px]` — mínimo `text-xs` (12px).
- Inputs y textareas: `font-size: 16px` en mobile (ya en `index.css`, evita auto-zoom iOS).

### Breakpoints de Tailwind
- `sm:` 640px · `md:` 768px · `lg:` 1024px · `xl:` 1280px · `2xl:` 1536px (casi nunca)

### Marco de layout (todas las secciones)
- El encuadre es único e igual para bodega, equipos, mantenimiento y tareas:
  `<main>` de AppShell y el contenedor interno de SubNavBar usan la MISMA
  receta: `mx-auto w-full max-w-screen-xl px-4 sm:px-6 md:pl-16 md:pr-16 lg:pl-20 lg:pr-20`.
- **NO** agregar contenedores con `max-w-*` ni padding horizontal propio en las
  vistas: heredan el marco del shell. Excepción intencional: `/tareas/pantalla`
  (overlay kiosk `fixed inset-0` vía portal, cubre todo el shell).

### Grids
- Cards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- StatCards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Forms: `grid md:grid-cols-2`

## Reglas de oro (leer antes de tocar nada)

1. **NO preguntar aprobación case-by-case** después de que el usuario dé luz verde. Ejecutar directo.
2. **El usuario corre `npm run build` él mismo** — nunca correr build desde Codex (da ETIMEDOUT en iCloud).
3. **NO migrar a TypeScript** — el usuario lo prefiere en JSX.
4. **NO agregar dependencias externas grandes** (React Query, SWR, Zustand, etc.) — solo React + hooks custom.
5. **Toda la UI y mensajes en español chileno** ("ingreso", "egreso", "bodega", "pesos CLP").
6. **Estilo directo** — sin rodeos, responder en español coloquial.

## Trabajo pendiente / deuda conocida (agosto 2026)

- **Idempotencia de la cola offline**: si un request llega al server pero la respuesta
  se pierde, el reintento duplica (falta token único por operación).
- **InventarioView/RegistrarEquipoView**: fetch crudo sin `useAsync`/`withRetry`; el formulario sin
  `useUnsavedChanges`. Bloque "cache → fetch" duplicado entre ambos (candidato a hook).
- **Duplicación restante**: mapeo de params del RPC `registrar_movimiento` ×3
  (candidato a `buildMovimientoParams`).
- **Bodega**: resumen limitado a 5 movimientos y historial paginado de 50;
  exportación de historial corresponde a la página visible. Catálogos por lotes.
- **Validación**: `validarEquipo` exige bodega
  aunque el modelo Fase 2 permite NULL con cliente.
- **Tests**: Bodega tiene pruebas de cantidades y catálogo en `tests/`; prueba SQL
  privada con esquema de prueba en `supabase/tests/`. Falta E2E y validación con los
  triggers reales de stock.
- **PWA**: no hay service worker ni instalabilidad.
- **Auditoría pendiente**: ya existe autoría para movimientos, tareas y altas; falta una
  bitácora detallada de cada campo modificado en productos/equipos/clientes.

## Lint / ESLint

- El React Compiler **no está en el build** (vite usa `@vitejs/plugin-react` plano),
  así que en `eslint.config.js` están OFF sus reglas ruidosas: `react-hooks/immutability`,
  `preserve-manual-memoization`, `set-state-in-effect`, `refs`.
- `react-refresh/only-export-components` quedó en `warn` (los contextos exportan
  hooks junto a componentes, patrón intencional).
- Los ref callbacks NUNCA deben retornar valor (React 19 lo toma como cleanup):
  siempre con llaves `ref={(el) => { refs.current.x = el; }}` (ver MovimientoDialog).

## Memoria persistente

Este archivo se lee al inicio de cada sesión. Hay más detalles en:
`~/.Codex/projects/.../memory/` — incluye `project-overview.md`, `user-preferences.md`,
`feedback-style.md`, `known-issues.md`.
