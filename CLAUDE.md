# Control de Bodega — Guía para Claude

App web unificada de Licman: **3 secciones en una sola SPA** (rama `unificacion-licman`).
En español chileno, usable desde iPhone y MacBook.

1. **Bodega** (`/bodega/*`) — inventario de repuestos/ferretería
2. **Equipos** (`/equipos/*`) — inventario de equipos entre bodegas y clientes, con fotos y papelera
3. **Mantenimiento** (`/mantenimiento/*`) — dashboard de OTs, técnicos, reincidencia y tiempos

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
│   ├── equipos/        # FormView (alta), ListView (inventario), ClientesView,
│   │                   #   TrashView (papelera), ExportView
│   └── mantenimiento/  # ResumenView, TecnicosView, ReincidenciaView, TiemposView
├── components/
│   ├── forms/          # ProductoForm (wizard 2 pasos), EntradaForm, SalidaForm
│   ├── equipos/        # EquiposHeader, MovimientoDialog, MovimientoHistorialModal,
│   │                   #   CrearClienteForm, PhotoUpload, EquipoFoto, ConfirmDialog…
│   ├── mantenimiento/  # DashboardShell, ChartCanvas, KpiCard, DataTable,
│   │                   #   FilterBar, SourceConfigPanel
│   └── ui/             # PageHeader, StatCard, Card, EmptyState, Skeleton, PillToast
├── context/            # ToastContext (queue FIFO max 4), NetworkContext
│                       #   (online/offline + flush de cola), DashboardContext
│                       #   (solo /mantenimiento: data + filtros + auto-refresh 2 min)
├── hooks/              # useAsync, useCodigoDisponible, useSiguienteCorrelativo,
│                       #   useUnsavedChanges
├── lib/                # offlineDb (IDB: cache + pendingWrites), offlineQueue (flush),
│                       #   equiposStorage (fotos), equiposValidacion, equiposExport,
│                       #   equiposConstants, dashboardData (loadData + circuit breaker),
│                       #   dashboardAnalytics, dashboardPresentation
├── services/           # supabase.js (cliente único compartido)
├── shell/              # AppShell (sidebar + topbar mobile), Sidebar, SubNavBar,
│                       #   subNavConfig (secciones y sub-nav por ruta)
├── utils/              # handleSupabaseError, withRetry, productCodeUtils,
│                       #   exportToExcel, exportWorkbook, format (formatCLP,
│                       #   formatearFecha, formatearFechaCorta)
├── App.jsx             # Router. SIN authGuard (ver "Auth" abajo)
└── main.jsx            # ToastProvider > NetworkProvider > App
```

## Base de datos (Supabase, proyecto único)

Tablas por sección:

- **Bodega**: `productos`, `stock_actual`, `bodega_movimientos` (antes `movimientos`, renombrada en migración 002)
- **Equipos**: `equipos`, `equipos_bodegas`, `equipos_movimientos`, `clientes`
- **Mantenimiento**: `mantenimiento_ots`, `mantenimiento_informes_terreno`, `mantenimiento_catalogo_clientes`, `mantenimiento_catalogo_tecnicos`

RPCs (siempre vía `supabase.rpc`, nunca escritura directa a equipos):
`insert_equipo`, `soft_delete_equipo`, `restore_equipo`, `hard_delete_equipo`,
`registrar_movimiento` (soporta cliente y swap), `preview_next_correlativo`.

Migraciones en `supabase/migrations/` (000–006), idempotentes.

## Auth: NO HAY (decisión consciente)

- Se eliminó el login en la unificación: la app es accesible para cualquiera con el link.
- **Riesgo aceptado**: RLS abierto a `anon` (`USING (true)`, migración 003) + `GRANT EXECUTE`
  en todas las funciones. Uso interno solamente. Si se reactiva auth, hay que rehacer
  AuthContext/Login (borrados en jul 2026, están en el historial de git) y cerrar las policies.

## Offline (sección Equipos)

- Cache de equipos en IndexedDB (`bodega-licman-equipos`, store `equipos`).
- Cola de mutaciones en store `pendingWrites` (**keyPath `id` + autoIncrement**, DB v2):
  `enqueuePendingWrite` al perder conexión; `flushQueue` (offlineQueue.js) la vuelca
  FIFO al volver la red (lo gatilla NetworkContext).
- Fotos y swaps **nunca** se encolan (se bloquean en UI con toast).

## Patrones del proyecto (respetar)

### Carga de datos — siempre con `useAsync`
```jsx
const { data, loading, error, refetch } = useAsync(cargarData, {
    errorContexto: "cargar productos",
    onError: (err) => showToast(err.message, "error"),
});
```
- **NO** usar `useState` + `useEffect` para fetches. Usar `useAsync`.
  (Deuda conocida: ListView/FormView de equipos aún usan fetch crudo.)
- Queries a Supabase siempre envueltas en `withRetry(() => ...)`.
- Errores normalizados con `handleSupabaseError(error, contexto).message`.
- `useAsync` retorna solo `{ data, loading, error, refetch }` — NO existe `setData`
  (hubo un ReferenceError por esto en TrashView).

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
  (Deuda conocida: chips de equipos usan `text-[0.55rem]`–`text-[0.68rem]`.)
- Inputs y textareas: `font-size: 16px` en mobile (ya en `index.css`, evita auto-zoom iOS).

### Breakpoints de Tailwind
- `sm:` 640px · `md:` 768px · `lg:` 1024px · `xl:` 1280px · `2xl:` 1536px (casi nunca)

### Grids
- Cards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- StatCards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Forms: `grid md:grid-cols-2`

## Reglas de oro (leer antes de tocar nada)

1. **NO preguntar aprobación case-by-case** después de que el usuario dé luz verde. Ejecutar directo.
2. **El usuario corre `npm run build` él mismo** — nunca correr build desde Claude (da ETIMEDOUT en iCloud).
3. **NO migrar a TypeScript** — el usuario lo prefiere en JSX.
4. **NO agregar dependencias externas grandes** (React Query, SWR, Zustand, etc.) — solo React + hooks custom.
5. **Toda la UI y mensajes en español chileno** ("ingreso", "egreso", "bodega", "pesos CLP").
6. **Estilo directo** — sin rodeos, responder en español coloquial.

## Trabajo pendiente / deuda conocida (julio 2026)

- **Idempotencia de la cola offline**: si un request llega al server pero la respuesta
  se pierde, el reintento duplica (falta token único por operación).
- **ListView/FormView** (equipos): fetch crudo sin `useAsync`/`withRetry`; FormView sin
  `useUnsavedChanges`. Bloque "cache → fetch" duplicado entre ambos (candidato a hook).
- **Duplicación restante**: mapeo de params del RPC `registrar_movimiento` ×3
  (candidato a `buildMovimientoParams`).
- **`key={location.pathname}` en AppShell** remonta el DashboardProvider al cambiar de tab.
- **Dashboard/Historial de bodega** traen TODOS los movimientos sin `.limit()`.
- **Tipografía**: chips de equipos bajo el mínimo de 12px; `validarEquipo` exige bodega
  aunque el modelo Fase 2 permite NULL con cliente.
- **Tests**: sin tests unitarios ni E2E.
- **PWA**: no hay service worker ni instalabilidad.
- **Auditoría**: no se trackea quién modificó qué.

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
`~/.claude/projects/.../memory/` — incluye `project-overview.md`, `user-preferences.md`,
`feedback-style.md`, `known-issues.md`.
