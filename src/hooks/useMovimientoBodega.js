import { useRef } from 'react';
import { supabase } from '../services/supabase';
import { withRetry } from '../utils/withRetry';
import { handleSupabaseError } from '../utils/handleSupabaseError';
import { useToast } from '../context/ToastContext';

// Conserva el token incluso si la respuesta se pierde; repetir el mismo intento
// no duplica el movimiento. Al confirmar éxito comienza una operación nueva.
export function useMovimientoBodega() {
    const intento = useRef(null);
    const ocupado = useRef(false);
    const toast = useToast();
    return async (movimiento) => {
        if (ocupado.current) return false;
        ocupado.current = true;
        const firma = JSON.stringify(movimiento);
        if (intento.current?.firma !== firma) intento.current = { firma, id: crypto.randomUUID() };
        try {
            await withRetry(async () => {
                const { error } = await supabase.rpc('guardar_movimiento_bodega', {
                    p_movimiento: movimiento, p_operacion: intento.current.id,
                });
                if (error) throw error;
            });
            intento.current = null;
            toast.success('Movimiento registrado correctamente');
            return true;
        } catch (error) {
            toast.error(handleSupabaseError(error, 'registrar el movimiento').message);
            return false;
        } finally {
            ocupado.current = false;
        }
    };
}
