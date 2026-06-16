// Hook centralizado para llamadas async (lectura y/o mutación).
// Normaliza el error vía handleSupabaseError, expone loading/error/data
// y un `refetch`/`execute` que evita race conditions con un flag `cancelado`.

import { useCallback, useEffect, useRef, useState } from "react";
import { handleSupabaseError, isAuthError } from "../utils/handleSupabaseError";
import { supabase } from "../services/supabase";

/**
 * @template T
 * @param {() => Promise<T>|T} asyncFn - Función a ejecutar. Si es sync, se resuelve.
 * @param {Object} [options]
 * @param {boolean} [options.immediate=true] - Si true, ejecuta al montar.
 * @param {Array<any>} [options.deps=[]] - Dependencias para re-ejecución automática.
 * @param {(err: import('../utils/handleSupabaseError').NormalizedError) => void} [options.onError]
 *   - Callback con el error YA normalizado.
 * @param {boolean} [options.showErrorToast=false] - Si true, también emite toast (vía callback).
 * @param {(msg: string, type?: 'success'|'error'|'warning'|'info') => void} [options.toastFn]
 *   - Si showErrorToast=true, el toast se emite a través de esta función.
 * @param {string} [options.errorContexto] - Contexto del error en español (ej: "cargar productos").
 * @param {boolean} [options.signOutOnAuth=true] - Si true, hace signOut al detectar 401/403.
 *
 * @returns {{
 *   data: T|undefined,
 *   loading: boolean,
 *   error: import('../utils/handleSupabaseError').NormalizedError|null,
 *   refetch: (...args: any[]) => Promise<T|null|undefined>,
 *   execute: (...args: any[]) => Promise<T|null|undefined>,
 *   setData: (next: T|undefined) => void,
 * }}
 */
export function useAsync(asyncFn, options = {}) {
    const {
        immediate = true,
        deps = [],
        onError,
        showErrorToast = false,
        toastFn,
        errorContexto = "operación",
        signOutOnAuth = true,
    } = options;

    const [data, setData] = useState(undefined);
    const [loading, setLoading] = useState(Boolean(immediate));
    const [error, setError] = useState(null);

    // Mantener la última versión de asyncFn/onError sin disparar el effect.
    const asyncFnRef = useRef(asyncFn);
    const onErrorRef = useRef(onError);
    useEffect(() => {
        asyncFnRef.current = asyncFn;
        onErrorRef.current = onError;
    });

    // Flag de cancelación para ignorar resultados de invocaciones viejas.
    const canceladoRef = useRef(false);

    const run = useCallback(
        async (...args) => {
            canceladoRef.current = false;
            setLoading(true);
            setError(null);
            try {
                const result = await asyncFnRef.current(...args);
                if (canceladoRef.current) return result ?? null;
                // Guardamos tal cual (puede ser undefined o array) para que
                // el default del destructuring del caller funcione.
                setData(result);
                return result ?? null;
            } catch (err) {
                if (canceladoRef.current) return null;
                const normalizado = handleSupabaseError(err, errorContexto);
                setError(normalizado);

                // Callback del caller.
                if (onErrorRef.current) {
                    try {
                        onErrorRef.current(normalizado);
                    } catch (cbErr) {
                        // No dejamos que un callback del caller rompa el flujo.
                        console.error("useAsync onError threw:", cbErr);
                    }
                }

                // Toast opcional.
                if (showErrorToast && toastFn) {
                    toastFn(normalizado.message, "error");
                }

                // Auth → signOut para que App.jsx redirija a Login.
                if (normalizado?.isAuth && signOutOnAuth) {
                    // Aviso al usuario (warning) si el caller inyectó un toast.
                    // Usamos un setTimeout para que se vea después de que el
                    // navigate a /login haya desmontado este componente.
                    if (toastFn) {
                        setTimeout(() => {
                            toastFn(
                                "Tu sesión expiró. Vuelve a iniciar sesión.",
                                "warning",
                                { duration: 5000 }
                            );
                        }, 50);
                    }
                    try {
                        await supabase.auth.signOut();
                    } catch (signOutErr) {
                        console.error("useAsync signOut failed:", signOutErr);
                    }
                }

                return null;
            } finally {
                if (!canceladoRef.current) setLoading(false);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [errorContexto, showErrorToast, signOutOnAuth]
    );

    useEffect(() => {
        if (immediate) {
            run();
        }
        return () => {
            canceladoRef.current = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    return {
        data,
        loading,
        error,
        refetch: run,
        execute: run,
        setData,
    };
}

/** Re-exporta isAuthError por conveniencia. */
export { isAuthError };
