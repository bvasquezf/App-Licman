import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { PERMISOS } from "../../lib/authPermissions";
import { useToast } from "../../context/ToastContext";

const capacidades = [
    PERMISOS.BODEGA_PRODUCTOS,
    PERMISOS.BODEGA_INGRESAR,
    PERMISOS.BODEGA_RETIRAR,
    PERMISOS.BODEGA_DEVOLVER,
    PERMISOS.BODEGA_HISTORIAL,
];

export default function BodegaAccesoPendiente() {
    const { profile, permisos, refrescarAcceso } = useAuth();
    const [actualizando, setActualizando] = useState(false);
    const toast = useToast();
    const faltanPermisos = profile?.rol_codigo === "superadmin"
        && capacidades.some((permiso) => !permisos.has(permiso));

    if (!faltanPermisos) return null;

    const actualizar = async () => {
        if (actualizando) return;
        setActualizando(true);
        try {
            const acceso = await refrescarAcceso();
            if (!acceso) {
                toast.error("No se pudo actualizar el acceso. Revisa la conexión");
            } else if (capacidades.some((p) => !acceso.permisos?.includes(p))) {
                toast.warning("La configuración de Bodega sigue pendiente en el servidor");
            } else {
                toast.success("Acceso actualizado: ya tienes todas las opciones de Bodega");
            }
        } catch {
            toast.error("No se pudo actualizar el acceso. Inténtalo nuevamente");
        } finally {
            setActualizando(false);
        }
    };

    return (
        <aside role="status" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="font-semibold">Falta completar la actualización de Bodega</p>
            <p className="mt-1">
                Tu cuenta de superadministrador aún no recibió los permisos para
                crear productos, ingresar compras, retirar, devolver y consultar
                el historial. Es necesario completar la configuración del servidor.
            </p>
            <button type="button" onClick={actualizar} disabled={actualizando}
                className="mt-3 min-h-[44px] rounded-xl border border-amber-300 px-4 font-semibold transition-colors hover:bg-amber-100 disabled:opacity-50 dark:border-amber-500/40 dark:hover:bg-amber-500/10">
                {actualizando ? "Actualizando…" : "Actualizar mi acceso"}
            </button>
        </aside>
    );
}
