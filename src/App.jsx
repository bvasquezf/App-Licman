import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
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

  useEffect(() => {
    if (window.location.hash.includes("error=")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  if (loading) return <p className="p-6">Cargando...</p>;

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
        <Route path="/actualizar-contraseña" element={<UpdatePassword />} />
      </Routes>
    </Layout>
  );
}

export default App;