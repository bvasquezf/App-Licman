import { useAuth } from "../../context/AuthContext";

export default function SinPermisosView() {
    const { profile, cerrarSesion, refrescarAcceso } = useAuth();

    return (
        <main className="flex min-h-[100dvh] items-center justify-center bg-slate-100 px-4 dark:bg-carbon-950">
            <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl dark:border-white/10 dark:bg-carbon-900">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-4xl dark:bg-white/10">
                    🧭
                </div>
                <h1 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">
                    No tienes módulos asignados
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-neutral-300">
                    Hola, {profile?.nombre_completo}. Tu cuenta está activa, pero el rol
                    actual no tiene módulos habilitados. Pídele a un administrador que
                    revise tu acceso.
                </p>
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
                        onClick={() => cerrarSesion()}
                        className="min-h-[44px] rounded-xl bg-slate-900 px-4 text-sm font-bold text-white dark:bg-white dark:text-slate-950"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </section>
        </main>
    );
}
