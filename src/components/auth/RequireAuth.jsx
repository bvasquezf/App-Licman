import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AuthLoading from "./AuthLoading";
import CuentaSinAccesoView from "../../views/auth/CuentaSinAccesoView";

export function RequireAuth() {
    const { session, profile, loading, accessError } = useAuth();
    const location = useLocation();

    if (loading) return <AuthLoading />;
    if (!session) {
        return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
    }
    if (accessError || !profile || !profile.activo) {
        return <CuentaSinAccesoView error={accessError} />;
    }
    return <Outlet />;
}

export function RequirePermission({ permiso }) {
    const { puede, rutaInicial } = useAuth();
    if (!puede(permiso)) {
        return <Navigate to={rutaInicial} replace />;
    }
    return <Outlet />;
}
