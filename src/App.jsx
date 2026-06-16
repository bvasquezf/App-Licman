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
        return <p className="p-6">Cargando...</p>;
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
