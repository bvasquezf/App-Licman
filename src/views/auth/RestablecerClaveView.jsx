import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AuthLoading from "../../components/auth/AuthLoading";

export default function RestablecerClaveView() {
    const auth = useAuth();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirmacion, setConfirmacion] = useState("");
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);

    if (auth.loading) return <AuthLoading mensaje="Validando el enlace…" />;
    if (!auth.session) return <Navigate to="/login" replace />;

    const submit = async (event) => {
        event.preventDefault();
        setError("");
        if (password.length < 8) {
            setError("La contraseña debe tener al menos 8 caracteres");
            return;
        }
        if (password !== confirmacion) {
            setError("Las contraseñas no coinciden");
            return;
        }
        setGuardando(true);
        try {
            await auth.cambiarClave(password);
            navigate(auth.profile?.activo ? auth.rutaInicial : "/login", {
                replace: true,
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <main className="flex min-h-[100dvh] items-center justify-center bg-slate-100 px-4 dark:bg-carbon-950">
            <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-carbon-900 sm:p-8">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-3xl dark:bg-brand-500/10">
                    🔐
                </div>
                <h1 className="text-2xl font-black text-slate-950 dark:text-white">
                    Crear nueva contraseña
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">
                    Usa al menos 8 caracteres y no compartas tu clave.
                </p>
                <form onSubmit={submit} className="mt-6 space-y-4">
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="new-password"
                        placeholder="Nueva contraseña"
                        className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/15 dark:bg-carbon-800"
                    />
                    <input
                        type="password"
                        value={confirmacion}
                        onChange={(event) => setConfirmacion(event.target.value)}
                        autoComplete="new-password"
                        placeholder="Repetir contraseña"
                        className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/15 dark:bg-carbon-800"
                    />
                    {error && (
                        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                            {error}
                        </p>
                    )}
                    <button
                        type="submit"
                        disabled={guardando}
                        className="min-h-[48px] w-full rounded-xl bg-brand-500 font-extrabold text-white hover:bg-brand-600 disabled:opacity-60"
                    >
                        {guardando ? "Guardando…" : "Guardar contraseña"}
                    </button>
                </form>
            </section>
        </main>
    );
}
