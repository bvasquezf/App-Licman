import { useAuth } from "../context/AuthContext";

/**
 * Nombre confiable que identifica a quien está usando la aplicación.
 * Los formularios lo muestran como solo lectura y Supabase conserva además
 * el id del usuario en `creado_por` para la auditoría.
 */
export function useResponsableSesion() {
    const { profile } = useAuth();
    return String(profile?.nombre_completo ?? "").trim();
}
