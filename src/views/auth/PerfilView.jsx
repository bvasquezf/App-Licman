import { useCallback, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useAsync } from "../../hooks/useAsync";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { MODULOS_ACCESO, PERMISOS, inicialesNombre } from "../../lib/authPermissions";
import { supabase } from "../../services/supabase";
import { withRetry } from "../../utils/withRetry";
import { formatearFecha } from "../../utils/format";

const inputClass =
    "min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/15 dark:bg-carbon-800 dark:text-white";

export default function PerfilView() {
    const auth = useAuth();
    const toast = useToast();
    const [form, setForm] = useState(() => ({
        nombre_completo: auth.profile?.nombre_completo ?? "",
        nombre_usuario: auth.profile?.nombre_usuario ?? "",
    }));
    const [guardando, setGuardando] = useState(false);
    const [enviandoClave, setEnviandoClave] = useState(false);
    const [versionGuardada, setVersionGuardada] = useState(0);

    useUnsavedChanges(form, {
        habilitado: Boolean(auth.profile?.id),
        resetKey: `${auth.profile?.id ?? "perfil"}:${versionGuardada}`,
    });

    const cargarActividad = useCallback(async () => {
        const { data, error } = await withRetry(() =>
            supabase.rpc("obtener_mi_actividad", {
                p_limite: 50,
                p_desde: 0,
            }),
        );
        if (error) throw error;
        return data ?? [];
    }, []);

    const { data: actividad = [], loading: cargandoActividad } = useAsync(
        cargarActividad,
        {
            errorContexto: "cargar tu actividad",
            onError: (error) => toast.error(error.message),
        },
    );

    const guardar = async (event) => {
        event.preventDefault();
        if (!form.nombre_completo.trim()) {
            toast.warning("Ingresa tu nombre completo");
            return false;
        }
        setGuardando(true);
        try {
            const { error } = await supabase.rpc("actualizar_mi_perfil", {
                p_nombre_completo: form.nombre_completo,
                p_nombre_usuario: form.nombre_usuario || null,
            });
            if (error) throw error;
            await auth.refrescarAcceso();
            setVersionGuardada((version) => version + 1);
            toast.success("Perfil actualizado");
            return true;
        } catch (error) {
            toast.error(error.message || "No se pudo actualizar el perfil");
            return false;
        } finally {
            setGuardando(false);
        }
    };

    const enviarCambioClave = async () => {
        if (!auth.user?.email || enviandoClave) return;
        setEnviandoClave(true);
        try {
            await auth.recuperarClave(auth.user.email);
            toast.success("Te enviamos el enlace para cambiar tu contraseña");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setEnviandoClave(false);
        }
    };

    const accesos = MODULOS_ACCESO.filter(({ permiso }) => auth.puede(permiso));

    return (
        <div className="space-y-6">
            <PageHeader
                icon="👤"
                title="Mi perfil"
                subtitle="Tus datos, accesos y actividad registrada en el sistema."
            />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
                <div className="space-y-5">
                    <Card padding="p-5 sm:p-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-xl font-black text-white shadow-lg">
                                {inicialesNombre(auth.profile?.nombre_completo)}
                            </div>
                            <div className="min-w-0">
                                <h2 className="truncate text-xl font-black text-slate-950 dark:text-white">
                                    {auth.profile?.nombre_completo}
                                </h2>
                                <p className="truncate text-sm text-slate-500 dark:text-neutral-400">
                                    {auth.user?.email}
                                </p>
                                <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                                    {auth.profile?.rol_nombre}
                                </span>
                            </div>
                        </div>

                        <form onSubmit={guardar} className="mt-6 space-y-4">
                            <label className="block">
                                <span className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">
                                    Nombre completo
                                </span>
                                <input
                                    value={form.nombre_completo}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            nombre_completo: event.target.value,
                                        }))
                                    }
                                    autoComplete="name"
                                    className={inputClass}
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">
                                    Nombre de usuario
                                </span>
                                <input
                                    value={form.nombre_usuario}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            nombre_usuario: event.target.value,
                                        }))
                                    }
                                    autoComplete="username"
                                    className={inputClass}
                                    placeholder="Opcional"
                                />
                            </label>
                            {auth.profile?.cargo && (
                                <p className="text-sm text-slate-500 dark:text-neutral-400">
                                    Cargo: <strong>{auth.profile.cargo}</strong>
                                </p>
                            )}
                            <button
                                type="submit"
                                disabled={guardando}
                                className="min-h-[44px] w-full rounded-xl bg-brand-500 px-4 text-sm font-extrabold text-white hover:bg-brand-600 disabled:opacity-60"
                            >
                                {guardando ? "Guardando…" : "Guardar perfil"}
                            </button>
                        </form>
                    </Card>

                    <Card padding="p-5">
                        <h2 className="font-black text-slate-900 dark:text-white">
                            Accesos habilitados
                        </h2>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {accesos.map((acceso) => (
                                <span
                                    key={acceso.permiso}
                                    className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                >
                                    ✓ {acceso.nombre}
                                </span>
                            ))}
                            {auth.puede(PERMISOS.USUARIOS) && (
                                <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                                    ✓ Administración de usuarios
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={enviarCambioClave}
                            disabled={enviandoClave}
                            className="mt-5 min-h-[44px] w-full rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
                        >
                            {enviandoClave
                                ? "Enviando…"
                                : "Enviar enlace para cambiar contraseña"}
                        </button>
                    </Card>
                </div>

                <Card padding="p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-black text-slate-950 dark:text-white">
                                Mi actividad reciente
                            </h2>
                            <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                                Acciones que quedaron asociadas a tu cuenta.
                            </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-neutral-300">
                            {actividad.length}
                        </span>
                    </div>

                    {cargandoActividad ? (
                        <div className="mt-5 space-y-3">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <Skeleton key={index} className="h-20" />
                            ))}
                        </div>
                    ) : actividad.length === 0 ? (
                        <div className="mt-5">
                            <EmptyState
                                icon="🕓"
                                title="Todavía no hay actividad"
                                description="Tus próximos movimientos y tareas aparecerán aquí."
                            />
                        </div>
                    ) : (
                        <ol className="mt-5 space-y-3">
                            {actividad.map((item, index) => (
                                <li
                                    key={`${item.modulo}-${item.referencia_id}-${item.fecha}-${index}`}
                                    className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-full bg-white px-2 py-1 text-xs font-extrabold text-slate-600 shadow-sm dark:bg-white/10 dark:text-neutral-300">
                                                    {item.modulo}
                                                </span>
                                                <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                                                    {item.tipo}
                                                </span>
                                            </div>
                                            <p className="mt-2 font-bold text-slate-900 dark:text-white">
                                                {item.titulo}
                                            </p>
                                            {item.detalle && (
                                                <p className="mt-1 text-sm text-slate-600 dark:text-neutral-300">
                                                    {item.detalle}
                                                </p>
                                            )}
                                        </div>
                                        <time className="text-xs font-medium text-slate-500 dark:text-neutral-400">
                                            {formatearFecha(item.fecha)}
                                        </time>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </Card>
            </div>
        </div>
    );
}
