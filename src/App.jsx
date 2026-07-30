import { Routes, Route, Navigate } from "react-router-dom";

import { AppShell } from "./shell/AppShell";
import { DashboardProvider } from "./context/DashboardContext";

// Sección Bodega (páginas existentes en /pages, rediseñadas)
import Dashboard from "./pages/Dashboard";
import Productos from "./pages/Productos";
import NuevaEntrada from "./pages/NuevaEntrada";
import NuevaSalida from "./pages/NuevaSalida";
import StockActual from "./pages/StockActual";
import Historial from "./pages/Historial";

// Sección Equipos (port del inventario)
import FormViewEquipos from "./views/equipos/FormView";
import ListViewEquipos from "./views/equipos/ListView";
import TrashViewEquipos from "./views/equipos/TrashView";
import ExportViewEquipos from "./views/equipos/ExportView";
import ClientesViewEquipos from "./views/equipos/ClientesView";

// Sección Mantenimiento (port del dashboard)
import ResumenViewMant from "./views/mantenimiento/ResumenView";
import TecnicosViewMant from "./views/mantenimiento/TecnicosView";
import ReincidenciaViewMant from "./views/mantenimiento/ReincidenciaView";
import TiemposViewMant from "./views/mantenimiento/TiemposView";

/**
 * App
 * ---
 * Router raíz. Todas las rutas viven dentro de <AppShell> que provee
 * el sidebar + topbar mobile. No hay authGuard por ahora — la app es
 * accesible para cualquiera con el link. Si en el futuro se reactiva
 * auth, se vuelve a envolver con un componente de guard.
 *
 * Las 4 rutas de Mantenimiento comparten <DashboardProvider> (data +
 * filtros + KPIs + auto-refresh). Las otras secciones no lo necesitan.
 */
function App() {
    return (
        <Routes>
            <Route element={<AppShell />}>
                <Route index element={<Navigate to="/bodega" replace />} />

                {/* Bodega */}
                <Route path="/bodega" element={<Dashboard />} />
                <Route path="/bodega/productos" element={<Productos />} />
                <Route path="/bodega/nueva-entrada" element={<NuevaEntrada />} />
                <Route path="/bodega/nueva-salida" element={<NuevaSalida />} />
                <Route path="/bodega/stock" element={<StockActual />} />
                <Route path="/bodega/historial" element={<Historial />} />

                {/* Equipos */}
                <Route path="/equipos" element={<FormViewEquipos />} />
                <Route path="/equipos/inventario" element={<ListViewEquipos />} />
                <Route path="/equipos/clientes" element={<ClientesViewEquipos />} />
                <Route path="/equipos/papelera" element={<TrashViewEquipos />} />
                <Route path="/equipos/exportar" element={<ExportViewEquipos />} />

                {/* Mantenimiento — comparten DashboardProvider */}
                <Route element={<DashboardProvider />}>
                    <Route path="/mantenimiento" element={<ResumenViewMant />} />
                    <Route
                        path="/mantenimiento/tecnicos"
                        element={<TecnicosViewMant />}
                    />
                    <Route
                        path="/mantenimiento/reincidencia"
                        element={<ReincidenciaViewMant />}
                    />
                    <Route
                        path="/mantenimiento/tiempos"
                        element={<TiemposViewMant />}
                    />
                </Route>

                {/* Fallback → bodega */}
                <Route path="*" element={<Navigate to="/bodega" replace />} />
            </Route>
        </Routes>
    );
}

export default App;