import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function CuentaSinAccesoView({ error }) {
    const { user, profile, cerrarSesion, refrescarAcceso } = useAuth();
    const [procesando, setProcesando] = useState(false);

    const salir = async () => {
        setProcesando(true);
        try {
            await cerrarSesion();
        } finally {
            setProcesando(false);
        }
    };

    return (
        <main className="flex min-h-[100dvh] items-center justify-center bg-slate-100 px-4 dark:bg-carbon-950">
            <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl dark:border-white/10 dark:bg-carbon-900">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-4xl dark:bg-amber-500/10">
                    🔒
                </div>
                <h1 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">
                    Cuenta pendiente de habilitación
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-neutral-300">
                    Tu sesión está iniciada como <strong>{user?.email}</strong>, pero un
                    administrador todavía debe activar tu perfil y asignarte un rol.
                </p>
                {profile?.nombre_completo && (
                    <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">
                        Perfil: {profile.nombre_completo}
                    </p>
                )}
                {error && (
                    <p className="mt-4 rounded-xl bg-rose-50 p-3 text-left text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                        No se pudo cargar el acceso. Verifica que la migración 028 esté aplicada.
                    </p>
                )}
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => refrescarAcceso()}
                        className="min-h-[44px] rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
                    >
                        Revisar nuevamente
                    </button>
                    <button
                        type="button"
                        disabled={procesando}
                        onClick={salir}
                        className="min-h-[44px] rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-black disabled:opacity-60 dark:bg-white dark:text-slate-950"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </section>
        </main>
    );
}
