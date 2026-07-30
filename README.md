# 📦 App Bodega Licman

App web unificada de gestión para Licman — **3 secciones en una sola SPA**, en español chileno, usable desde iPhone y MacBook.

## 🧭 Secciones

| Sección | Ruta | Qué hace |
|---|---|---|
| **Bodega** | `/bodega/*` | Inventario de repuestos: productos, entradas (compras), salidas (consumos), stock, historial, valorización, export a Excel |
| **Equipos** | `/equipos/*` | Inventario de equipos entre bodegas y clientes: altas con foto, movimientos, swaps, clientes, papelera, export |
| **Mantenimiento** | `/mantenimiento/*` | Dashboard de OTs e informes de terreno: KPIs, técnicos, reincidencia, tiempos, con auto-refresh |

## 🛠️ Stack

- **React 19** + **Vite 8** + **React Router 7** (SPA, JSX plano — sin TypeScript)
- **Tailwind CSS 4** (`@tailwindcss/vite`)
- **Supabase** — PostgreSQL + PostgREST + Storage (un solo proyecto compartido)
- **chart.js** — gráficos del dashboard de mantenimiento
- **idb** — IndexedDB (cache de equipos + cola offline)
- **xlsx** — exportación a Excel
- Deploy: **Netlify**

## 🚀 Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run lint     # eslint
```

Requiere un `.env` con:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## 🗄️ Base de datos

Migraciones idempotentes en `supabase/migrations/` (000–006).

- **Bodega**: `productos`, `stock_actual`, `bodega_movimientos`
- **Equipos**: `equipos`, `equipos_bodegas`, `equipos_movimientos`, `clientes`
- **Mantenimiento**: `mantenimiento_ots`, `mantenimiento_informes_terreno`, catálogos

Las escrituras de equipos se hacen siempre vía RPC (`insert_equipo`, `registrar_movimiento`,
`soft_delete_equipo`, `restore_equipo`, `hard_delete_equipo`), nunca con inserts directos.

## 📴 Offline (sección Equipos)

Los equipos se cachean en IndexedDB y las mutaciones hechas sin conexión se encolan
(`pendingWrites`) y se sincronizan automáticamente al volver la red.
Fotos y swaps requieren conexión (se bloquean en la UI).

## 🔓 Acceso

La app **no tiene login** (decisión consciente, uso interno): cualquiera con el link
puede usarla, y el RLS de Supabase está abierto al rol `anon`. No exponer públicamente
datos sensibles sin antes reactivar autenticación y cerrar las policies.

## 📁 Estructura

```
src/
├── pages/          # Sección Bodega
├── views/          # Secciones Equipos y Mantenimiento
├── components/     # forms/ equipos/ mantenimiento/ ui/
├── context/        # Toast, Network (offline), Dashboard (mantenimiento)
├── hooks/          # useAsync, useUnsavedChanges, validaciones
├── lib/            # offlineDb/offlineQueue, equipos*, dashboard*
├── shell/          # AppShell + Sidebar + SubNavBar
├── services/       # cliente Supabase
└── utils/          # errores, retry, export Excel
```

## 📌 Notas

- Regla de stock: entradas suman, salidas restan, no se permite stock negativo (validado en BD).
- Los productos no se borran: se desactivan (`activo = false`) para mantener trazabilidad.
- Los equipos eliminados van a una papelera (soft delete) con opción de restaurar o borrado definitivo.
