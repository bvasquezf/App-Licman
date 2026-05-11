import { useState } from "react";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";

function UpdatePassword() {
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [loading, setLoading] = useState(false);

    const handleUpdatePassword = async (e) => {
        e.preventDefault();

        if (!password || !passwordConfirm) {
            alert("Debes ingresar y confirmar la nueva contraseña");
            return;
        }

        if (password.length < 6) {
            alert("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        if (password !== passwordConfirm) {
            alert("Las contraseñas no coinciden");
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: "https://tu-app.netlify.app/update-password",
        });

        setLoading(false);

        if (error) {
            console.error("Error al actualizar contraseña:", error);
            alert("No se pudo actualizar la contraseña");
            return;
        }

        alert("Contraseña actualizada correctamente");

        await supabase.auth.signOut();

        navigate("/login");
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
            <form
                onSubmit={handleUpdatePassword}
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow"
            >
                <h1 className="mb-2 text-2xl font-bold text-gray-800">
                    Cambiar contraseña
                </h1>

                <p className="mb-6 text-sm text-gray-500">
                    Ingresa tu nueva contraseña para recuperar el acceso.
                </p>

                <div className="mb-4">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Nueva contraseña
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                        placeholder="Nueva contraseña"
                    />
                </div>

                <div className="mb-6">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Repetir contraseña
                    </label>
                    <input
                        type="password"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                        placeholder="Repite la nueva contraseña"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? "Actualizando..." : "Actualizar contraseña"}
                </button>
            </form>
        </div>
    );
}

export default UpdatePassword;