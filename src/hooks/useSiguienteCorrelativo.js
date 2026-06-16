// Hook que consulta el siguiente correlativo disponible para un prefijo dado.
// Estrategia: SELECT codigo WHERE codigo LIKE 'PRE-%' y se calcula MAX(numero) en JS.
// Los productos desactivados también cuentan (no se reusan números).
// Tiene un debounce de 350ms para no spamear BD mientras el usuario tipea.

import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { parsearCodigo } from "../utils/productCodeUtils";

const DEBOUNCE_MS = 350;

/**
 * useSiguienteCorrelativo(prefijo, { habilitado })
 * Devuelve { siguiente, loading, error, refetch }.
 * - siguiente: número (>=1) que se puede usar como correlativo.
 * - loading / error: estado de la consulta.
 * - refetch: función para forzar reconsulta (botón "regenerar").
 */
export function useSiguienteCorrelativo(prefijo, { habilitado = true } = {}) {
    const [siguiente, setSiguiente] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (!habilitado || !prefijo) {
            setSiguiente(1);
            setLoading(false);
            return;
        }

        let cancelado = false;
        setLoading(true);
        setError(null);

        const timer = setTimeout(async () => {
            try {
                const { data, error: err } = await supabase
                    .from("productos")
                    .select("codigo")
                    .like("codigo", `${prefijo}-%`);

                if (cancelado) return;

                if (err) throw err;

                // Calcula el máximo número entre los códigos del prefijo.
                // Ignora nulls, códigos malformados y prefijos distintos.
                const max = (data || []).reduce((acc, row) => {
                    const parsed = parsearCodigo(row.codigo);
                    if (!parsed || parsed.prefijo !== prefijo) return acc;
                    return Math.max(acc, parsed.numero);
                }, 0);

                setSiguiente(max + 1);
            } catch (e) {
                if (cancelado) return;
                console.error("Error consultando correlativo:", e);
                setError(e);
                setSiguiente(1); // fallback seguro
            } finally {
                if (!cancelado) setLoading(false);
            }
        }, DEBOUNCE_MS);

        return () => {
            cancelado = true;
            clearTimeout(timer);
        };
    }, [prefijo, habilitado, tick]);

    return {
        siguiente,
        loading,
        error,
        refetch: () => setTick((t) => t + 1),
    };
}
