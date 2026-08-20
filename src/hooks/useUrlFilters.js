import { useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Estado liviano de filtros respaldado por la URL. Los valores iguales
 * al predeterminado se eliminan para mantener enlaces cortos y legibles.
 */
export function useUrlFilters(defaultValues) {
    const defaultsRef = useRef(defaultValues);
    const [searchParams, setSearchParams] = useSearchParams();

    const values = useMemo(() => {
        const actuales = {};
        for (const [key, fallback] of Object.entries(defaultsRef.current)) {
            actuales[key] = searchParams.get(key) ?? fallback;
        }
        return actuales;
    }, [searchParams]);

    const setFilter = useCallback(
        (key, value) => {
            setSearchParams(
                (anteriores) => {
                    const siguientes = new URLSearchParams(anteriores);
                    const fallback = defaultsRef.current[key];
                    if (
                        value === null ||
                        value === undefined ||
                        value === "" ||
                        value === fallback
                    ) {
                        siguientes.delete(key);
                    } else {
                        siguientes.set(key, String(value));
                    }
                    return siguientes;
                },
                { replace: true },
            );
        },
        [setSearchParams],
    );

    const clearFilters = useCallback(() => {
        setSearchParams(
            (anteriores) => {
                const siguientes = new URLSearchParams(anteriores);
                for (const key of Object.keys(defaultsRef.current)) {
                    siguientes.delete(key);
                }
                return siguientes;
            },
            { replace: true },
        );
    }, [setSearchParams]);

    return [values, setFilter, clearFilters];
}
