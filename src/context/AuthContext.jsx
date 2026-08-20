import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    getRememberSession,
    setRememberSession,
    supabase,
} from "../services/supabase";
import { rutaInicialParaPermisos } from "../lib/authPermissions";

const AuthContext = createContext(null);

function mensajeAuth(error) {
    const texto = String(error?.message ?? "").toLowerCase();
    if (texto.includes("invalid login credentials")) {
        return "El correo o la contraseña no son correctos";
    }
    if (texto.includes("email not confirmed")) {
        return "Primero debes confirmar tu correo electrónico";
    }
    if (texto.includes("user already registered")) {
        return "Ya existe una cuenta con ese correo";
    }
    if (texto.includes("password should be")) {
        return "La contraseña debe tener al menos 8 caracteres";
    }
    if (texto.includes("rate limit") || texto.includes("too many")) {
        return "Se hicieron demasiados intentos. Espera un momento y vuelve a probar";
    }
    return error?.message || "No se pudo completar la autenticación";
}

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [accessError, setAccessError] = useState(null);
    const mountedRef = useRef(true);
    const requestRef = useRef(0);
    const profileRef = useRef(null);
    const sessionUserIdRef = useRef(null);
    const accesoResueltoRef = useRef(false);
    const ultimaRevisionRef = useRef(0);

    const cargarAcceso = useCallback(async (
        sesionActual,
        { conservarAcceso = false } = {},
    ) => {
        const requestId = ++requestRef.current;
        if (!sesionActual?.user) {
            if (mountedRef.current && requestId === requestRef.current) {
                profileRef.current = null;
                accesoResueltoRef.current = true;
                setProfile(null);
                setAccessError(null);
                setLoading(false);
            }
            return null;
        }

        const { data, error } = await supabase.rpc("obtener_mi_acceso");
        if (!mountedRef.current || requestId !== requestRef.current) return null;

        if (error) {
            // Al volver desde segundo plano puede haber un corte de red muy
            // breve. Si ya conocemos el acceso de esta misma cuenta, mantenemos
            // la vista montada y lo revisaremos nuevamente en el próximo foco.
            if (!conservarAcceso || !profileRef.current) {
                profileRef.current = null;
                setProfile(null);
                setAccessError(error);
            }
        } else {
            profileRef.current = data ?? null;
            setProfile(profileRef.current);
            setAccessError(null);
        }
        accesoResueltoRef.current = true;
        setLoading(false);
        return data ?? null;
    }, []);

    useEffect(() => {
        mountedRef.current = true;

        supabase.auth.getSession().then(({ data, error }) => {
            if (!mountedRef.current) return;
            const sesionInicial = error ? null : data?.session ?? null;
            sessionUserIdRef.current = sesionInicial?.user?.id ?? null;
            setSession(sesionInicial);
            void cargarAcceso(sesionInicial);
        });

        const { data: listener } = supabase.auth.onAuthStateChange(
            (_evento, nuevaSession) => {
                if (!mountedRef.current) return;
                const nuevoUsuarioId = nuevaSession?.user?.id ?? null;
                const mismoUsuario = Boolean(
                    nuevoUsuarioId
                    && nuevoUsuarioId === sessionUserIdRef.current,
                );
                const refrescoEnSegundoPlano = mismoUsuario
                    && accesoResueltoRef.current;

                sessionUserIdRef.current = nuevoUsuarioId;
                setSession(nuevaSession);

                if (!nuevaSession) {
                    // Invalida una consulta de permisos que pudiera seguir en curso.
                    requestRef.current += 1;
                    profileRef.current = null;
                    accesoResueltoRef.current = true;
                    setProfile(null);
                    setAccessError(null);
                    setLoading(false);
                    return;
                }

                // Una renovación del token de la misma cuenta no debe desmontar
                // la ruta actual: solo los cambios reales de cuenta son bloqueantes.
                if (!refrescoEnSegundoPlano) {
                    accesoResueltoRef.current = false;
                    setLoading(true);
                }
                // Evita ejecutar una segunda llamada de Auth dentro del callback
                // interno de Supabase, que puede bloquear otros eventos.
                window.setTimeout(() => {
                    if (mountedRef.current) {
                        void cargarAcceso(nuevaSession, {
                            conservarAcceso: refrescoEnSegundoPlano,
                        });
                    }
                }, 0);
            },
        );

        return () => {
            mountedRef.current = false;
            listener?.subscription?.unsubscribe();
        };
    }, [cargarAcceso]);

    // Si un administrador cambia el rol o desactiva esta cuenta desde otro
    // equipo, refrescamos los permisos al volver a enfocar la aplicación.
    useEffect(() => {
        if (!session) return undefined;
        const revisarAlVolver = () => {
            if (document.visibilityState !== "visible") return;

            // Chrome suele disparar focus y visibilitychange juntos. Evitamos
            // consultar dos veces los permisos por una sola vuelta a la app.
            const ahora = Date.now();
            if (ahora - ultimaRevisionRef.current < 750) return;
            ultimaRevisionRef.current = ahora;
            void cargarAcceso(session, { conservarAcceso: true });
        };
        window.addEventListener("focus", revisarAlVolver);
        document.addEventListener("visibilitychange", revisarAlVolver);
        return () => {
            window.removeEventListener("focus", revisarAlVolver);
            document.removeEventListener("visibilitychange", revisarAlVolver);
        };
    }, [cargarAcceso, session]);

    const permisos = useMemo(
        () => new Set(Array.isArray(profile?.permisos) ? profile.permisos : []),
        [profile?.permisos],
    );

    const iniciarSesion = useCallback(async ({ email, password, recordar }) => {
        setRememberSession(Boolean(recordar));
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
        });
        if (error) throw new Error(mensajeAuth(error));
        return data;
    }, []);

    const registrarPrimerAdmin = useCallback(
        async ({ email, password, nombreCompleto }) => {
            setRememberSession(true);
            const { data, error } = await supabase.auth.signUp({
                email: email.trim().toLowerCase(),
                password,
                options: {
                    data: { nombre_completo: nombreCompleto.trim() },
                    emailRedirectTo: `${window.location.origin}/login`,
                },
            });
            if (error) throw new Error(mensajeAuth(error));
            return data;
        },
        [],
    );

    const recuperarClave = useCallback(async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(
            email.trim().toLowerCase(),
            { redirectTo: `${window.location.origin}/restablecer-clave` },
        );
        if (error) throw new Error(mensajeAuth(error));
    }, []);

    const cambiarClave = useCallback(async (password) => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw new Error(mensajeAuth(error));
    }, []);

    const cerrarSesion = useCallback(async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(mensajeAuth(error));
    }, []);

    const refrescarAcceso = useCallback(
        () => cargarAcceso(session),
        [cargarAcceso, session],
    );

    const puede = useCallback(
        (permiso) => Boolean(permiso && profile?.activo && permisos.has(permiso)),
        [permisos, profile?.activo],
    );

    const value = useMemo(
        () => ({
            session,
            user: session?.user ?? null,
            profile,
            permisos,
            loading,
            accessError,
            recordarSesion: getRememberSession(),
            puede,
            rutaInicial: rutaInicialParaPermisos(permisos),
            iniciarSesion,
            registrarPrimerAdmin,
            recuperarClave,
            cambiarClave,
            cerrarSesion,
            refrescarAcceso,
        }),
        [
            accessError,
            cambiarClave,
            cerrarSesion,
            iniciarSesion,
            loading,
            permisos,
            profile,
            puede,
            recuperarClave,
            refrescarAcceso,
            registrarPrimerAdmin,
            session,
        ],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
    return context;
}
