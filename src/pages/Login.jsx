import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";

function Login() {
  const { login, register } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isRegister, setIsRegister] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [loading, setLoading] = useState(false);

  const getRedirectUrl = () => {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isLocalhost) {
      return "http://localhost:5173/update-password";
    }

    return `${window.location.origin}/update-password`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      alert("Debes ingresar tu correo");
      return;
    }

    if (!isRecovery && !password.trim()) {
      alert("Debes ingresar tu contraseña");
      return;
    }

    setLoading(true);

    if (isRecovery) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getRedirectUrl(),
      });

      setLoading(false);

      if (error) {
        console.error("Error al enviar recuperación:", error);
        alert("No se pudo enviar el correo de recuperación");
        return;
      }

      alert("Te enviamos un correo para restablecer tu contraseña");
      setIsRecovery(false);
      setIsRegister(false);
      return;
    }

    const response = isRegister
      ? await register(email, password)
      : await login(email, password);

    setLoading(false);

    if (response?.error) {
      alert(response.error.message);
    }
  };

  const cambiarAModoLogin = () => {
    setIsRegister(false);
    setIsRecovery(false);
    setPassword("");
  };

  const cambiarAModoRegistro = () => {
    setIsRegister(true);
    setIsRecovery(false);
    setPassword("");
  };

  const cambiarAModoRecuperacion = () => {
    setIsRecovery(true);
    setIsRegister(false);
    setPassword("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-800">
            Control de Bodega
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            {isRecovery
              ? "Recupera el acceso a tu cuenta"
              : isRegister
              ? "Crea tu cuenta"
              : "Inicia sesión para continuar"}
          </p>
        </div>

        <form
          className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm"
          onSubmit={handleSubmit}
        >
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Correo
            </label>
            <input
              type="email"
              placeholder="tucorreo@ejemplo.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {!isRecovery && (
            <div className="mb-6">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Contraseña
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {isRecovery && (
            <p className="mb-6 text-xs leading-relaxed text-slate-500">
              Ingresa tu correo y te enviaremos un enlace para crear una nueva
              contraseña.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
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
            <p
              className="mt-4 cursor-pointer text-center text-xs text-slate-500 hover:text-indigo-600"
              onClick={cambiarAModoRecuperacion}
            >
              ¿Olvidaste tu contraseña?
            </p>
          )}

          <p
            className="mt-4 cursor-pointer text-center text-xs text-indigo-500 hover:text-indigo-700"
            onClick={isRecovery || isRegister ? cambiarAModoLogin : cambiarAModoRegistro}
          >
            {isRecovery
              ? "Volver al inicio de sesión"
              : isRegister
              ? "¿Ya tienes cuenta? Inicia sesión"
              : "¿No tienes cuenta? Regístrate"}
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;