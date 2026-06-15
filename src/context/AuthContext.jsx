import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

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
                    setIsPasswordRecovery(true);
                } else {
                    setIsPasswordRecovery(false);
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
                emailRedirectTo: "https://appinventariorepuestos.netlify.app",
            },
        });
    };

    const logout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider
            value={{ session, loading, login, register, logout, isPasswordRecovery }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);