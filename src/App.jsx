import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./shell/AppShell";
import { DashboardProvider } from "./context/DashboardContext";
import Dashboard from "./pages/Dashboard";
import Productos from "./pages/Productos";
import NuevaEntrada from "./pages/NuevaEntrada";
import NuevaSalida from "./pages/NuevaSalida";
import StockActual from "./pages/StockActual";
import Historial from "./pages/Historial";
import RegistrarEquipoView from "./views/equipos/RegistrarEquipoView";
import InventarioView from "./views/equipos/InventarioView";
import PapeleraView from "./views/equipos/PapeleraView";
import ExportarView from "./views/equipos/ExportarView";
import ClientesViewEquipos from "./views/equipos/ClientesView";
import MovimientosViewEquipos from "./views/equipos/MovimientosView";
import BateriasView from "./views/equipos/BateriasView";
import ResumenViewMant from "./views/mantenimiento/ResumenView";
import TecnicosViewMant from "./views/mantenimiento/TecnicosView";
import ReincidenciaViewMant from "./views/mantenimiento/ReincidenciaView";
import TiemposViewMant from "./views/mantenimiento/TiemposView";
import TareasView from "./views/tareas/TareasView";
import LoginView from "./views/auth/LoginView";
import RestablecerClaveView from "./views/auth/RestablecerClaveView";
import PerfilView from "./views/auth/PerfilView";
import UsuariosView from "./views/auth/UsuariosView";
import SinPermisosView from "./views/auth/SinPermisosView";
import {
    RequireAuth,
    RequirePermission,
} from "./components/auth/RequireAuth";
import { PERMISOS } from "./lib/authPermissions";

function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginView />} />
            <Route
                path="/restablecer-clave"
                element={<RestablecerClaveView />}
            />

            <Route element={<RequireAuth />}>
                <Route path="/sin-acceso" element={<SinPermisosView />} />

                <Route element={<AppShell />}>
                    <Route index element={<Navigate to="/bodega" replace />} />
                    <Route path="/perfil" element={<PerfilView />} />

                    <Route
                        element={
                            <RequirePermission permiso={PERMISOS.USUARIOS} />
                        }
                    >
                        <Route path="/usuarios" element={<UsuariosView />} />
                    </Route>

                    <Route
                        element={<RequirePermission permiso={PERMISOS.BODEGA} />}
                    >
                        <Route path="/bodega" element={<Dashboard />} />
                        <Route path="/bodega/productos" element={<Productos />} />
                        <Route
                            path="/bodega/nueva-entrada"
                            element={<NuevaEntrada />}
                        />
                        <Route
                            path="/bodega/nueva-salida"
                            element={<NuevaSalida />}
                        />
                        <Route path="/bodega/stock" element={<StockActual />} />
                        <Route path="/bodega/historial" element={<Historial />} />
                    </Route>

                    <Route
                        element={<RequirePermission permiso={PERMISOS.EQUIPOS} />}
                    >
                        <Route path="/equipos" element={<InventarioView />} />
                        <Route
                            path="/equipos/registrar"
                            element={<RegistrarEquipoView />}
                        />
                        <Route
                            path="/equipos/inventario"
                            element={<Navigate to="/equipos" replace />}
                        />
                        <Route
                            path="/equipos/clientes"
                            element={<ClientesViewEquipos />}
                        />
                        <Route
                            path="/equipos/movimientos"
                            element={<MovimientosViewEquipos />}
                        />
                        <Route path="/equipos/baterias" element={<BateriasView />} />
                        <Route path="/equipos/papelera" element={<PapeleraView />} />
                        <Route path="/equipos/exportar" element={<ExportarView />} />
                    </Route>

                    <Route
                        element={
                            <RequirePermission permiso={PERMISOS.MANTENIMIENTO} />
                        }
                    >
                        <Route element={<DashboardProvider />}>
                            <Route
                                path="/mantenimiento"
                                element={<ResumenViewMant />}
                            />
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
                    </Route>

                    <Route
                        element={<RequirePermission permiso={PERMISOS.TAREAS} />}
                    >
                        <Route
                            path="/tareas"
                            element={<TareasView vista="agenda" />}
                        />
                        <Route
                            path="/tareas/por-programar"
                            element={<TareasView vista="por_programar" />}
                        />
                        <Route
                            path="/tareas/tablero"
                            element={<TareasView vista="tablero" />}
                        />
                        <Route
                            path="/tareas/calendario"
                            element={<TareasView vista="calendario" />}
                        />
                        <Route
                            path="/tareas/tecnicos"
                            element={<TareasView vista="tecnicos" />}
                        />
                        <Route
                            path="/tareas/mis-tareas"
                            element={<TareasView vista="mis_tareas" />}
                        />
                        <Route
                            path="/tareas/finalizadas"
                            element={<TareasView vista="finalizadas" />}
                        />
                    </Route>

                    <Route path="*" element={<Navigate to="/bodega" replace />} />
                </Route>
            </Route>
        </Routes>
    );
}

export default App;
