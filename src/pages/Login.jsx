import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
    supabase,
    getRememberPreference,
    setRememberPreference,
} from "../services/supabase";

const inputClass =
    "w-full rounded-xl border border-slate-200/60 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20 sm:text-base";

function Login() {
    const { login, register } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [isRegister, setIsRegister] = useState(false);
    const [isRecovery, setIsRecovery] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [info, setInfo] = useState(null);
    const [remember, setRemember] = useState(getRememberPreference);

    const getRedirectUrl = () => {
        const isLocalhost =
            window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1";

        if (isLocalhost) {
            return "http://localhost:5173/update-password";
        }

        return `${window.location.origin}/update-password`;
    };

    const validarEmail = (value) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setInfo(null);

        if (!email.trim()) {
            setError("Debes ingresar tu correo");
            return;
        }

        if (!validarEmail(email)) {
            setError("El formato del correo no es válido");
            return;
        }

        if (!isRecovery && !password.trim()) {
            setError("Debes ingresar tu contraseña");
            return;
        }

        setLoading(true);
        setRememberPreference(remember);

        if (isRecovery) {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: getRedirectUrl(),
            });

            setLoading(false);

            // No revelamos si el correo existe o no: siempre el mismo mensaje
            setInfo(
                "Si el correo está registrado, te enviaremos un enlace para restablecer tu contraseña."
            );
            setIsRecovery(false);
            setIsRegister(false);
            return;
        }

        const response = isRegister
            ? await register(email, password)
            : await login(email, password);

        setLoading(false);

        if (response?.error) {
            setError("Correo o contraseña incorrectos");
        }
    };

    const cambiarAModoLogin = () => {
        setIsRegister(false);
        setIsRecovery(false);
        setPassword("");
        setError(null);
        setInfo(null);
    };

    const cambiarAModoRegistro = () => {
        setIsRegister(true);
        setIsRecovery(false);
        setPassword("");
        setError(null);
        setInfo(null);
    };

    const cambiarAModoRecuperacion = () => {
        setIsRecovery(true);
        setIsRegister(false);
        setPassword("");
        setError(null);
        setInfo(null);
    };

    return (
        <div
            className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950"
            style={{
                paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
            }}
        >
            <div className="w-full max-w-sm sm:max-w-md">
                <div className="mb-6 text-center sm:mb-8">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-2xl text-white shadow-sm sm:mb-4 sm:h-14 sm:w-14">
                        📦
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100 sm:text-3xl">
                        Control de Bodega
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {isRecovery
                            ? "Recupera el acceso a tu cuenta"
                            : isRegister
                            ? "Crea tu cuenta"
                            : "Inicia sesión para continuar"}
                    </p>
                </div>

                <form
                    className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8"
                    onSubmit={handleSubmit}
                    noValidate
                >
                    <div className="mb-4">
                        <label
                            htmlFor="email"
                            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
                        >
                            Correo
                        </label>
                        <input
                            id="email"
                            type="email"
                            placeholder="tucorreo@ejemplo.com"
                            className={inputClass}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            disabled={loading}
                        />
                    </div>

                    {!isRecovery && (
                        <div className="mb-4">
                            <label
                                htmlFor="password"
                                className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
                            >
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                className={inputClass}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete={
                                    isRegister
                                        ? "new-password"
                                        : "current-password"
                                }
                                disabled={loading}
                            />
                        </div>
                    )}

                    {isRecovery && (
                        <p className="mb-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                            Ingresa tu correo y te enviaremos un enlace para
                            crear una nueva contraseña.
                        </p>
                    )}

                    {!isRecovery && (
                        <label className="mb-4 flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={(e) =>
                                    setRemember(e.target.checked)
                                }
                                disabled={loading}
                                className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
                            />
                            <span>Recordar sesión en este equipo</span>
                        </label>
                    )}

                    {error && (
                        <div
                            role="alert"
                            className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                        >
                            {error}
                        </div>
                    )}

                    {info && (
                        <div
                            role="status"
                            className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                        >
                            {info}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading
                            ? "Procesando..."
                            : isRecovery
                            ? "Enviar link de recuperación"
                            : isRegister
                            ? "Registrarse"
                            : "Ingresar"}
                    </button>

                    {!isRecovery && !isRegister && (
                        <button
                            type="button"
                            className="mt-4 w-full text-center text-xs text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                            onClick={cambiarAModoRecuperacion}
                        >
                            ¿Olvidaste tu contraseña?
                        </button>
                    )}

                    <button
                        type="button"
                        className="mt-3 w-full text-center text-xs text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                        onClick={
                            isRecovery || isRegister
                                ? cambiarAModoLogin
                                : cambiarAModoRegistro
                        }
                    >
                        {isRecovery
                            ? "Volver al inicio de sesión"
                            : isRegister
                            ? "¿Ya tienes cuenta? Inicia sesión"
                            : "¿No tienes cuenta? Regístrate"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Login;
