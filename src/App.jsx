import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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
    const { session, loading } = useAuth();
    const [isRecovery, setIsRecovery] = useState(false);

    useEffect(() => {
        // Supabase v2 PKCE manda ?type=recovery en la URL
        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace("#", "?"));

        const type = params.get("type") || hashParams.get("type");

        if (type === "recovery") {
            setIsRecovery(true);
            // Limpiar la URL sin recargar
            window.history.replaceState(null, "", window.location.pathname);
        }

        if (window.location.hash.includes("error=")) {
            window.history.replaceState(null, "", window.location.pathname);
        }
    }, []);

    if (loading) return <p className="p-6">Cargando...</p>;

    if (!session) return <Login />;

    // Si viene del link de recuperación, mostrar UpdatePassword
    if (isRecovery) return <UpdatePassword onDone={() => setIsRecovery(false)} />;

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