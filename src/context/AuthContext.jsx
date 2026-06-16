import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    // True solo cuando Supabase dispara el evento PASSWORD_RECOVERY
    // (es decir, el usuario llegó haciendo clic en el link del correo).
    const [isRecovery, setIsRecovery] = useState(false);

    useEffect(() => {
        const obtenerSesion = async () => {
            const { data } = await supabase.auth.getSession();
            setSession(data.session);
            setLoading(false);
        };
        obtenerSesion();

        const { data: listener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setSession(session);

                if (event === "PASSWORD_RECOVERY") {
                    setIsRecovery(true);
                }

                // Si el usuario cierra sesión o se completa el recovery,
                // reseteamos el flag para que no quede "pegado".
                if (event === "SIGNED_OUT") {
                    setIsRecovery(false);
                }
            }
        );

        return () => {
            listener.subscription.unsubscribe();
        };
    }, []);

    const login = async (email, password) => {
        return await supabase.auth.signInWithPassword({ email, password });
    };

    const register = async (email, password) => {
        return await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/`,
            },
        });
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setIsRecovery(false);
    };

    return (
        <AuthContext.Provider
            value={{ session, loading, isRecovery, login, register, logout }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
