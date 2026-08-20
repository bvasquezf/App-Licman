import { useCallback, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { supabase } from "../../services/supabase";
import ThemeToggle from "../../components/ui/ThemeToggle";

const inputClass =
    "min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/15 dark:bg-carbon-800 dark:text-white";

export default function LoginView() {
    const auth = useAuth();
    const location = useLocation();
    const [modo, setModo] = useState("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmacion, setConfirmacion] = useState("");
    const [nombre, setNombre] = useState("");
    const [recordar, setRecordar] = useState(auth.recordarSesion);
    const [enviando, setEnviando] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [errorForm, setErrorForm] = useState("");

    const revisarConfiguracion = useCallback(async () => {
        const { data, error } = await supabase.rpc(
            "requiere_configurar_administrador",
        );
        if (error) throw error;
        return Boolean(data);
    }, []);

    const {
        data: requiereAdmin,
        loading: revisando,
        error: errorConfiguracion,
    } = useAsync(
        revisarConfiguracion,
        { errorContexto: "revisar la configuración de usuarios" },
    );

    useEffect(() => {
        if (requiereAdmin === true) setModo("configurar");
    }, [requiereAdmin]);

    if (!auth.loading && auth.session && auth.profile?.activo) {
        const desde = location.state?.desde;
        return <Navigate to={desde || auth.rutaInicial} replace />;
    }

    const submit = async (event) => {
        event.preventDefault();
        setErrorForm("");
        setMensaje("");

        if (!email.trim()) {
            setErrorForm("Ingresa tu correo electrónico");
            return;
        }
        if (modo !== "recuperar" && password.length < 8) {
            setErrorForm("La contraseña debe tener al menos 8 caracteres");
            return;
        }
        if (modo === "configurar") {
            if (!nombre.trim()) {
                setErrorForm("Ingresa el nombre del administrador");
                return;
            }
            if (password !== confirmacion) {
                setErrorForm("Las contraseñas no coinciden");
                return;
            }
        }

        setEnviando(true);
        try {
            if (modo === "recuperar") {
                await auth.recuperarClave(email);
                setMensaje(
                    "Te enviamos un enlace para crear una nueva contraseña. Revisa también la carpeta de spam.",
                );
            } else if (modo === "configurar") {
                const data = await auth.registrarPrimerAdmin({
                    email,
                    password,
                    nombreCompleto: nombre,
                });
                if (!data?.session) {
                    setMensaje(
                        "Cuenta creada. Confirma tu correo y luego inicia sesión.",
                    );
                    setModo("login");
                }
            } else {
                await auth.iniciarSesion({ email, password, recordar });
            }
        } catch (error) {
            setErrorForm(error.message);
        } finally {
            setEnviando(false);
        }
    };

    const titulo =
        modo === "configurar"
            ? "Configurar administrador"
            : modo === "recuperar"
              ? "Recuperar contraseña"
              : "Iniciar sesión";

    return (
        <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-slate-100 px-4 py-8 dark:bg-carbon-950">
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-500/15 blur-3xl" />
                <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-slate-900/10 blur-3xl dark:bg-white/5" />
            </div>

            <div className="absolute right-4 top-4 z-10">
                <ThemeToggle />
            </div>

            <section className="relative z-10 w-full max-w-md rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-carbon-900/90 sm:p-8">
                <div className="mb-7 text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-slate-200 dark:ring-white/10">
                        <img src="/favicon.png" alt="Licman" className="h-14 w-14 object-contain" />
                    </div>
                    <img
                        src="/logo.png"
                        alt="Licman"
                        className="mx-auto mt-5 h-8 w-auto dark:brightness-0 dark:invert"
                    />
                    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-neutral-400">
                        Gestión integral de inventario y operaciones
                    </p>
                </div>

                <div className="mb-5">
                    <h1 className="text-2xl font-black text-slate-950 dark:text-white">
                        {titulo}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                        {modo === "configurar"
                            ? "Esta cuenta tendrá acceso completo para crear al resto del equipo."
                            : modo === "recuperar"
                              ? "Te enviaremos un enlace seguro a tu correo."
                              : "Usa la cuenta asignada por el administrador."}
                    </p>
                </div>

                {requiereAdmin && modo === "configurar" && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                        Este es el primer acceso. Crea la cuenta administradora de Licman.
                    </div>
                )}

                {errorConfiguracion && (
                    <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                        No se pudo cargar la configuración de acceso. Revisa que la migración 028 esté aplicada en Supabase.
                    </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                    {modo === "configurar" && (
                        <label className="block">
                            <span className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">
                                Nombre completo
                            </span>
                            <input
                                type="text"
                                value={nombre}
                                onChange={(event) => setNombre(event.target.value)}
                                autoComplete="name"
                                className={inputClass}
                                placeholder="Ej: Brian González"
                            />
                        </label>
                    )}

                    <label className="block">
                        <span className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">
                            Correo electrónico
                        </span>
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            autoComplete="email"
                            inputMode="email"
                            className={inputClass}
                            placeholder="nombre@licman.cl"
                        />
                    </label>

                    {modo !== "recuperar" && (
                        <label className="block">
                            <span className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">
                                Contraseña
                            </span>
                            <input
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                autoComplete={modo === "configurar" ? "new-password" : "current-password"}
                                className={inputClass}
                                placeholder="Mínimo 8 caracteres"
                            />
                        </label>
                    )}

                    {modo === "configurar" && (
                        <label className="block">
                            <span className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">
                                Repetir contraseña
                            </span>
                            <input
                                type="password"
                                value={confirmacion}
                                onChange={(event) => setConfirmacion(event.target.value)}
                                autoComplete="new-password"
                                className={inputClass}
                            />
                        </label>
                    )}

                    {modo === "login" && (
                        <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm font-medium text-slate-600 dark:text-neutral-300">
                            <input
                                type="checkbox"
                                checked={recordar}
                                onChange={(event) => setRecordar(event.target.checked)}
                                className="h-5 w-5 accent-brand-500"
                            />
                            Recordar mi sesión en este equipo
                        </label>
                    )}

                    {errorForm && (
                        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                            {errorForm}
                        </p>
                    )}
                    {mensaje && (
                        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                            {mensaje}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={enviando || revisando || Boolean(errorConfiguracion)}
                        className="min-h-[48px] w-full rounded-xl bg-brand-500 px-4 text-base font-extrabold text-white shadow-[0_8px_24px_rgba(255,26,34,0.25)] transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {enviando
                            ? "Procesando…"
                            : modo === "configurar"
                              ? "Crear administrador"
                              : modo === "recuperar"
                                ? "Enviar enlace"
                                : "Entrar"}
                    </button>
                </form>

                {!requiereAdmin && modo === "login" && (
                    <button
                        type="button"
                        onClick={() => {
                            setModo("recuperar");
                            setErrorForm("");
                            setMensaje("");
                        }}
                        className="mt-4 min-h-[44px] w-full text-sm font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                    >
                        Olvidé mi contraseña
                    </button>
                )}
                {modo === "recuperar" && (
                    <button
                        type="button"
                        onClick={() => {
                            setModo("login");
                            setErrorForm("");
                            setMensaje("");
                        }}
                        className="mt-4 min-h-[44px] w-full text-sm font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                    >
                        Volver al inicio de sesión
                    </button>
                )}
            </section>
        </main>
    );
}
