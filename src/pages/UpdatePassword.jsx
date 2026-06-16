import { useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";

const MAX_PASSWORD_LENGTH = 72; // límite de bcrypt
const COMMON_PASSWORDS = new Set([
    "password",
    "password1",
    "password123",
    "12345678",
    "123456789",
    "1234567890",
    "qwerty123",
    "qwertyuiop",
    "11111111",
    "00000000",
    "abcdef123",
    "iloveyou",
    "admin1234",
    "welcome123",
    "contraseña",
    "contraseña1",
]);

function validarPassword(pw) {
    if (!pw) return "Debes ingresar una contraseña";
    if (pw.length < 8) return "Debe tener al menos 8 caracteres";
    if (pw.length > MAX_PASSWORD_LENGTH) {
        return `No puede tener más de ${MAX_PASSWORD_LENGTH} caracteres`;
    }
    if (!/[A-Z]/.test(pw)) return "Debe tener al menos una mayúscula";
    if (!/[a-z]/.test(pw)) return "Debe tener al menos una minúscula";
    if (!/[0-9]/.test(pw)) return "Debe tener al menos un número";
    if (COMMON_PASSWORDS.has(pw.toLowerCase())) {
        return "Esta contraseña es muy común, elige otra";
    }
    return null;
}

function UpdatePassword() {
    const { session, logout } = useAuth();
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    // Si no hay sesión activa (link expirado o inválido), avisamos al usuario
    // en vez de dejarlo enviar un formulario que va a fallar.
    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
                <div className="w-full max-w-sm rounded-2xl border border-slate-200/60 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-2xl dark:bg-rose-500/15 sm:mb-4 sm:h-14 sm:w-14">
                        ⏱️
                    </div>
                    <h1 className="text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100 sm:text-2xl">
                        Link expirado
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        El enlace de recuperación ya no es válido o expiró.
                        Vuelve a pedir uno nuevo.
                    </p>
                    <a
                        href="/"
                        className="mt-6 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:shadow-md active:scale-95"
                    >
                        Volver al inicio
                    </a>
                </div>
            </div>
        );
    }

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        setError(null);

        const errorValidacion = validarPassword(password);
        if (errorValidacion) {
            setError(errorValidacion);
            return;
        }

        if (password !== passwordConfirm) {
            setError("Las contraseñas no coinciden");
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (error) {
            // Mensaje genérico para no exponer detalles internos
            setError(
                "No se pudo actualizar la contraseña. Vuelve a pedir un nuevo enlace."
            );
            return;
        }

        setSuccess(true);
        // Damos un breve feedback antes de cerrar sesión
        setTimeout(async () => {
            await logout();
        }, 1500);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
            <div className="w-full max-w-sm sm:max-w-md">
                <div className="mb-6 text-center sm:mb-8">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-2xl text-white shadow-sm sm:mb-4 sm:h-14 sm:w-14">
                        🔒
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100 sm:text-3xl">
                        Nueva contraseña
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Elige una contraseña segura para tu cuenta
                    </p>
                </div>

                <form
                    className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8"
                    onSubmit={handleUpdatePassword}
                >
                    <div className="mb-4">
                        <label
                            htmlFor="new-password"
                            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
                        >
                            Nueva contraseña
                        </label>
                        <input
                            id="new-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border border-slate-200/60 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20 sm:text-base"
                            placeholder="Mínimo 8 caracteres"
                            autoComplete="new-password"
                            maxLength={MAX_PASSWORD_LENGTH}
                            disabled={loading || success}
                        />
                    </div>

                    <div className="mb-4">
                        <label
                            htmlFor="confirm-password"
                            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
                        >
                            Repetir contraseña
                        </label>
                        <input
                            id="confirm-password"
                            type="password"
                            value={passwordConfirm}
                            onChange={(e) =>
                                setPasswordConfirm(e.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200/60 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20 sm:text-base"
                            placeholder="Repite la nueva contraseña"
                            autoComplete="new-password"
                            maxLength={MAX_PASSWORD_LENGTH}
                            disabled={loading || success}
                        />
                    </div>

                    <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                        Mínimo 8 caracteres, una mayúscula, una minúscula y un
                        número. Evita contraseñas comunes.
                    </p>

                    {error && (
                        <div
                            role="alert"
                            className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                        >
                            {error}
                        </div>
                    )}

                    {success && (
                        <div
                            role="status"
                            className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                        >
                            Contraseña actualizada. Cerrando sesión...
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || success}
                        className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading
                            ? "Actualizando..."
                            : success
                            ? "Listo"
                            : "Actualizar contraseña"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default UpdatePassword;
