# 📦 App Bodega Licman

App web unificada de gestión para Licman — **4 secciones en una sola SPA**, en español chileno, usable desde iPhone y MacBook.

## 🧭 Secciones

| Sección | Ruta | Qué hace |
|---|---|---|
| **Bodega** | `/bodega/*` | Inventario de repuestos: productos, entradas (compras), salidas (consumos), stock, historial, valorización, export a Excel |
| **Equipos** | `/equipos/*` | Inventario de equipos entre bodegas y clientes: altas con foto, movimientos, swaps, clientes, papelera, export |
| **Mantenimiento** | `/mantenimiento/*` | Dashboard de OTs e informes de terreno: KPIs, técnicos, reincidencia, tiempos, con auto-refresh |
| **Tareas** | `/tareas/*` | Planificación de taller y terreno: tablero, calendario, carga por técnico y trabajos finalizados |

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
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

La variable antigua `VITE_SUPABASE_ANON_KEY` sigue siendo compatible durante
la transición. Nunca agregar una secret key ni `service_role` al frontend.

## 🗄️ Base de datos

La aplicación utiliza un backend Supabase administrado de forma privada. Este
repositorio público no incluye migraciones SQL, configuración operativa ni el
código de las funciones administrativas.

- **Bodega**: `productos`, `stock_actual`, `bodega_movimientos`
- **Equipos**: `equipos`, `equipos_bodegas`, `equipos_movimientos`, `clientes`
- **Mantenimiento**: `mantenimiento_ots`, `mantenimiento_informes_terreno`, catálogos
- **Tareas**: `tareas`, `tareas_tecnicos`, `tareas_historial`
- **Accesos**: `perfiles`, `roles_app`, `permisos_app`, `roles_permisos_app`

Las escrituras de equipos se hacen siempre vía RPC (`insert_equipo`, `registrar_movimiento`,
`soft_delete_equipo`, `restore_equipo`, `hard_delete_equipo`), nunca con inserts directos.

## 📴 Offline (sección Equipos)

Los equipos se cachean en IndexedDB y las mutaciones hechas sin conexión se encolan
(`pendingWrites`) con el ID del usuario que las creó. Se sincronizan automáticamente
al volver la red, pero nunca a nombre de otra cuenta.
Fotos y swaps requieren conexión (se bloquean en la UI).

## 🔐 Acceso y primera configuración

La app usa Supabase Auth con correo y contraseña. El backend aplica RLS por módulo,
mantiene el acceso anónimo cerrado y registra automáticamente quién creó cada
movimiento o tarea.

1. En Supabase Auth, agregar como Redirect URLs:
   `http://localhost:5173/restablecer-clave` y la misma ruta del dominio productivo.
2. Desplegar la infraestructura desde su repositorio privado.
3. Abrir la app. Si todavía no hay usuarios, el login mostrará la configuración del
   primer administrador.
4. Después de crear el administrador, desactivar los registros públicos en Supabase
   Auth. Los demás usuarios se crean desde **Usuarios y accesos**.

Si Supabase conservaba cuentas de una versión anterior, la migración las deja como
**Sin acceso** en vez de convertir una cuenta antigua en administrador automáticamente.

Roles incluidos: Administrador, Supervisor, Bodega, Operador de equipos, Técnico,
Planificador y Sin acceso. Los permisos se validan en React, RLS y triggers de base de
datos; esconder una ruta no es la barrera de seguridad.

## 🌐 Publicación en Netlify

El repositorio incluye `netlify.toml` con el build de Vite, la redirección de la
SPA, Node 22, caché de assets y encabezados de seguridad.

1. Conectar este repositorio desde **Netlify → Add new project → Import an existing project**.
2. Elegir la rama de producción y confirmar `npm run lint && npm run build` como
   build command y `dist` como publish directory.
3. En **Environment variables**, agregar `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_PUBLISHABLE_KEY`. Son las únicas variables Supabase del frontend.
4. En Supabase Auth configurar el dominio final como **Site URL** y agregar
   `/login` y `/restablecer-clave` a las Redirect URLs permitidas.
5. Desactivar los registros públicos en Supabase Auth; las cuentas nuevas se
   crean por invitación desde la aplicación.

Cada `git push` a la rama de producción genera automáticamente un nuevo deploy.

## 📁 Estructura

```
src/
├── pages/          # Sección Bodega
├── views/          # Equipos, Mantenimiento, Tareas y Auth
├── components/     # forms/ equipos/ mantenimiento/ tareas/ auth/ ui/
├── context/        # Auth, Toast, Network, Theme y Dashboard
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
