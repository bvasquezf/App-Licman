export default function AuthLoading({ mensaje = "Cargando tu sesión…" }) {
    return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-6 dark:bg-carbon-950">
            <div className="text-center" role="status" aria-live="polite">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg dark:bg-carbon-800">
                    <img src="/favicon.png" alt="" className="h-11 w-11 object-contain" />
                </div>
                <div className="mx-auto mt-5 h-1.5 w-32 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-brand-500" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-500 dark:text-neutral-400">
                    {mensaje}
                </p>
            </div>
        </div>
    );
}
