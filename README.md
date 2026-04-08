📦 DOCUMENTO MAESTRO — SISTEMA INVENTARIO BODEGA
1. 🧭 Descripción General del Proyecto
🎯 Objetivo

Desarrollar una aplicación web para la gestión de inventario de una bodega, permitiendo controlar:

Productos
Stock
Entradas (compras)
Salidas (consumos)
Historial de movimientos
Valorización del inventario
🚨 Problema que resuelve

Actualmente la empresa trabaja en Excel sin control centralizado, lo que genera:

Desorden en el inventario
Falta de trazabilidad
Dificultad para conocer stock real
Falta de valorización confiable
📌 Alcance actual

El sistema permite:

CRUD de productos
Registro de entradas (compras)
Registro de salidas
Control automático de stock
Dashboard con KPIs
Exportación a Excel
Autenticación de usuarios
2. 🛠️ Stack Tecnológico
Frontend
JavaScript
React (Vite)
Tailwind CSS
Backend (BaaS)
Supabase
Base de datos PostgreSQL
Autenticación
API REST automática
Librerías principales
react-router-dom → navegación
supabase-js → conexión DB
xlsx (o equivalente) → exportación Excel
Herramientas externas
Supabase (DB + Auth)
Netlify (deploy frontend)
GitHub (repositorio)
3. 🏗️ Arquitectura del Sistema
Tipo de arquitectura
Frontend SPA (React)
Backend como servicio (Supabase)
Arquitectura tipo client → API → DB
Flujo de datos
Usuario → React → Supabase Client → PostgreSQL
Comunicación
React usa supabase-js
Queries directas a la DB (sin backend propio)
4. 📁 Estructura del Proyecto
src/
│
├── components/
│   ├── layout/
│   ├── forms/
│   └── ui/
│
├── pages/
│   ├── Dashboard.jsx
│   ├── Productos.jsx
│   ├── Entradas.jsx
│   ├── Salidas.jsx
│   ├── Stock.jsx
│   └── Historial.jsx
│
├── services/
│   └── supabase.js
│
├── utils/
│   └── exportWorkbook.js
│
├── context/
│   └── AuthContext.jsx
│
└── App.jsx
Componentes clave
Layout.jsx → navegación y sidebar
Dashboard.jsx → KPIs principales
ProductoForm.jsx → creación/edición productos
EntradaForm.jsx → compras
SalidaForm.jsx → consumo
5. 🗄️ Modelos de Datos
📦 Tabla: productos
Campo	Tipo	Descripción
id	uuid	PK
codigo	text	Código producto
nombre	text	Nombre
categoria	text	Categoría
unidad	text	Unidad medida
stock_minimo	integer	Nivel mínimo
precio_referencia	numeric	Opcional
activo	boolean	Estado
📊 Tabla: stock_actual
Campo	Tipo
id	uuid
stock	integer
🔄 Tabla: movimientos
Campo	Tipo
id	uuid
tipo_movimiento	text (entrada, salida)
cantidad	integer
precio_unitario	numeric
fecha	timestamp
producto_id	FK
Relaciones
productos (1) → movimientos (N)
productos (1) → stock_actual (1)
6. ⚙️ Lógica de Negocio
📦 Stock
Entrada → suma stock
Salida → resta stock
Validación: no permitir stock negativo
💰 Precios
Regla clave
precio_referencia → opcional
precio_unitario → obligatorio en compras
🧠 Casos especiales
Productos antiguos
pueden NO tener precio
se registran igual
Valor inventario
solo considera productos con precio
se muestra como estimado
🔐 Eliminación de productos
❌ No se puede eliminar si tiene movimientos
✔️ Se usa activo = false (desactivación)
7. ✅ Funcionalidades Implementadas
✔️ Completas
Login / Auth
CRUD productos
Entradas (compras)
Salidas
Control stock automático
Dashboard
Exportación Excel
Filtro activos/inactivos
⚠️ Parcial
UI responsive (en mejora)
Valorización avanzada
Edición de productos mejorable
❌ Pendiente
Reportes avanzados
Alertas automáticas
Roles de usuario
Backend propio (opcional futuro)
8. 🐞 Problemas Actuales
Técnicos
Error frecuente: prod is not defined
Dependencia de variables dentro de map
UI en móvil aún no 100% optimizada
Funcionales
Productos sin precio afectan KPI
No hay historial de cambios de precios
No hay soft delete histórico
9. 🧠 Decisiones Técnicas
✔️ Uso de Supabase
Rápido desarrollo
Sin backend propio
✔️ Precio opcional
No bloquear inventario
Realista para empresa
✔️ Soft delete (activo)
Mantener trazabilidad
Evitar errores de FK
❌ Backend tradicional descartado (por ahora)
Mayor complejidad
No necesario en esta etapa
10. 🎨 UI / UX
Estilo
Tailwind CSS
Minimalista
Colores por estado:
Verde → OK
Rojo → alerta
Amarillo → advertencia
Componentes
Cards KPI
Listados tipo cards
Sidebar navegación
Formularios simples
Responsive
Sidebar colapsable (en progreso)
Grid adaptativo
11. 🧼 Buenas Prácticas
Código
Uso de hooks (useState, useEffect)
Separación por capas
Funciones reutilizables
Datos
Validaciones antes de insertar
Manejo de null vs 0
Evitar datos falsos
UX
Mensajes claros
Prevención de errores
Feedback visual
12. 🚀 Próximos Pasos
Corto plazo
Mejorar responsive completo
Validaciones UX
Mejorar formularios
Medio plazo
KPI más avanzados
Historial de precios
Alertas stock mínimo
Largo plazo
Backend propio (Node/.NET)
Multiusuario avanzado
App móvil
13. 📌 Notas Importantes
El sistema está pensado para crecer
No todos los datos deben ser perfectos desde el inicio

El objetivo es:

Controlar primero, optimizar después

🔥 RESUMEN CLAVE

Este sistema es:

👉 Un inventario realista, no teórico
👉 Diseñado para empresas que vienen de Excel
👉 Escalable hacia algo más profesional
