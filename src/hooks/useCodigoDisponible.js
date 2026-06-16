// Verifica si un código de producto ya existe en la base de datos.
// Hace debounce de 500ms, soporta exclusión del producto en edición y
// maneja el ciclo de vida de la query (cancela queries obsoletas).

import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

/**
 * @param {string} codigo - Código a verificar.
 * @param {Object} [options]
 * @param {boolean} [options.habilitado=true] - Si false, no se hace la query.
 * @param {number|string|null} [options.excluirId=null] - ID a excluir
 *   (modo edición: ignoramos el match con el producto que se está editando).
 * @param {number} [options.debounceMs=500] - Tiempo de espera tras el último cambio.
 * @returns {{
 *   disponible: boolean|null, // null = aún no se sabe
 *   loading: boolean,
 *   error: string|null,
 * }}
 */
export function useCodigoDisponible(codigo, options = {}) {
    const {
        habilitado = true,
        excluirId = null,
        debounceMs = 500,
    } = options;

    const [state, setState] = useState({
        disponible: null,
        loading: false,
        error: null,
    });

    useEffect(() => {
        // Sin código o deshabilitado → no se sabe / limpiar.
        if (!habilitado || !codigo || !codigo.trim()) {
            setState({ disponible: null, loading: false, error: null });
            return;
        }

        let cancelado = false;
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const timer = setTimeout(async () => {
            try {
                let query = supabase
                    .from("productos")
                    .select("id")
                    .eq("codigo", codigo.trim())
                    .limit(1);

                if (excluirId != null) {
                    query = query.neq("id", excluirId);
                }

                const { data, error } = await query;
                if (cancelado) return;

                if (error) {
                    setState({
                        disponible: null,
                        loading: false,
                        error: error.message || "Error al verificar código",
                    });
                    return;
                }

                setState({
                    disponible: !(data && data.length > 0),
                    loading: false,
                    error: null,
                });
            } catch (err) {
                if (cancelado) return;
                setState({
                    disponible: null,
                    loading: false,
                    error: err?.message || "Error al verificar código",
                });
            }
        }, debounceMs);

        return () => {
            cancelado = true;
            clearTimeout(timer);
        };
    }, [codigo, habilitado, excluirId, debounceMs]);

    return {
        ...state,
    };
}
