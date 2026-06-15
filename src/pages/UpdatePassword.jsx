import { useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";

function UpdatePassword() {
    const { logout } = useAuth();
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [loading, setLoading] = useState(false);

    const validarPassword = (pw) => {
        if (pw.length < 8) return "Debe tener al menos 8 caracteres";
        if (!/[A-Z]/.test(pw)) return "Debe tener al menos una mayúscula";
        if (!/[a-z]/.test(pw)) return "Debe tener al menos una minúscula";
        if (!/[0-9]/.test(pw)) return "Debe tener al menos un número";
        return null;
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();

        if (!password || !passwordConfirm) {
            alert("Debes ingresar y confirmar la nueva contraseña");
            return;
        }

        const errorValidacion = validarPassword(password);
        if (errorValidacion) {
            alert(errorValidacion);
            return;
        }

        if (password !== passwordConfirm) {
            alert("Las contraseñas no coinciden");
            return;
        }

        setLoading(true);

        // Esta es la función correcta para actualizar la contraseña
        const { error } = await supabase.auth.updateUser({ password });

        setLoading(false);

        if (error) {
            console.error("Error al actualizar contraseña:", error);
            alert("No se pudo actualizar la contraseña: " + error.message);
            return;
        }

        alert("Contraseña actualizada correctamente. Por seguridad, inicia sesión nuevamente.");
        await logout();
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
            <div className="w-full max-w-sm">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-semibold text-slate-800">
                        Nueva contraseña
                    </h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Elige una contraseña segura para tu cuenta
                    </p>
                </div>

                <form
                    className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm"
                    onSubmit={handleUpdatePassword}
                >
                    <div className="mb-4">
                        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
                            Nueva contraseña
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
                            placeholder="Mínimo 8 caracteres"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
                            Repetir contraseña
                        </label>
                        <input
                            type="password"
                            value={passwordConfirm}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
                            placeholder="Repite la nueva contraseña"
                        />
                    </div>

                    <p className="mb-4 text-xs text-slate-400">
                        La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.
                    </p>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? "Actualizando..." : "Actualizar contraseña"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default UpdatePassword;