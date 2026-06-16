import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/layout/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Productos from "./pages/Productos";
import NuevaEntrada from "./pages/NuevaEntrada";
import NuevaSalida from "./pages/NuevaSalida";
import StockActual from "./pages/StockActual";
import Historial from "./pages/Historial";
import UpdatePassword from "./pages/UpdatePassword";

function App() {
    const { session, loading, isRecovery } = useAuth();
    const location = useLocation();

    // Limpia el hash si viene con error (ej: link de recovery inválido/expirado)
    useEffect(() => {
        if (window.location.hash.includes("error=")) {
            window.history.replaceState(
                null,
                "",
                window.location.pathname + window.location.search
            );
        }
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-3xl text-white shadow-lg">
                        📦
                    </div>
                    <div className="h-1.5 w-48 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div className="h-full w-1/3 animate-[shimmer_1.2s_infinite] rounded-full bg-indigo-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        Cargando Control de Bodega…
                    </p>
                </div>
            </div>
        );
    }

    const enUpdatePassword = location.pathname === "/update-password";

    // /update-password SOLO se renderiza si el usuario llegó desde el link
    // del correo (evento PASSWORD_RECOVERY) y tiene sesión activa.
    if (enUpdatePassword) {
        if (session && isRecovery) {
            return <UpdatePassword />;
        }
        // Sin sesión de recovery → lo mandamos al login.
        return <Navigate to="/" replace />;
    }

    if (!session) return <Login />;

    return (
        <Layout>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/productos" element={<Productos />} />
                <Route path="/entradas" element={<NuevaEntrada />} />
                <Route path="/salidas" element={<NuevaSalida />} />
                <Route path="/stock" element={<StockActual />} />
                <Route path="/historial" element={<Historial />} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Layout>
    );
}

export default App;
