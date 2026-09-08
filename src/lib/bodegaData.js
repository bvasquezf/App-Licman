import { supabase } from '../services/supabase';
import { withRetry } from '../utils/withRetry';

// Evita que el límite de respuesta de Supabase oculte parte del catálogo.
export async function leerCatalogoBodega(tabla, { soloActivos = false } = {}) {
    if (!['productos', 'stock_actual'].includes(tabla)) throw new Error('Catálogo de bodega inválido');
    const filas = [];
    let cursor = null;
    for (;;) {
        const lote = await withRetry(async () => {
            let query = supabase.from(tabla).select('*').order('id').limit(500);
            if (soloActivos) query = query.eq('activo', true);
            if (cursor !== null) query = query.gt('id', cursor);
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        });
        filas.push(...lote);
        if (lote.length < 500) return filas;
        cursor = lote.at(-1).id;
    }
}
