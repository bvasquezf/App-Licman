// Sincronización de mutaciones pendientes contra Supabase.
//
// Cuando una mutación (insert_equipo, soft_delete, restore,
// movimiento, notify_delete) se ejecuta offline, se encola en IDB.
// Al volver la conexión, esta función recorre la cola en orden FIFO
// y aplica cada mutación contra Supabase. Si una falla por un error
// transitorio (red, 5xx, 429), se reintenta hasta 5 veces antes de
// descartar.
//
// notify_delete es especial: si falla, se descarta inmediatamente
// (es un email, no queremos spamear al admin).
//
// Proyecto Supabase único (consolidación 2026): un solo cliente
// compartido para bodega · equipos · mantenimiento.
//
// Fase 2 (movimientos con clientes): el handler `movimiento` se
// extendió con params opcionales de cliente y swap. Los SWAPS no
// son offline-capable (la pierna 2 depende del `padre.id` de la
// pierna 1) — el padre (InventarioView) los bloquea antes de encolar.

import { supabase } from "../services/supabase";
import {
    getPendingWrites,
    incrementPendingRetry,
    removePendingWrite,
} from "./offlineDb";

const MAX_RETRIES = 5;

const HANDLERS = {
    /**
     * payload: { equipo: {...} }
     */
    async insert_equipo({ payload }) {
        if (!supabase) throw new Error("Supabase no configurado");
        const { error } = await supabase.rpc("insert_equipo", {
            p_equipo: payload.equipo,
        });
        if (error) throw error;
    },

    /**
     * payload: { id }
     */
    async soft_delete({ payload }) {
        if (!supabase) throw new Error("Supabase no configurado");
        const { error } = await supabase.rpc("soft_delete_equipo", {
            p_id: payload.id,
        });
        if (error) throw error;
    },

    /**
     * payload: { id }
     */
    async restore({ payload }) {
        if (!supabase) throw new Error("Supabase no configurado");
        const { error } = await supabase.rpc("restore_equipo", {
            p_id: payload.id,
        });
        if (error) throw error;
    },

    /**
     * payload: {
     *   equipo_id, bodega_origen, bodega_destino, ubicacion_origen,
     *   ubicacion_destino, motivo, responsable, notas, p_foto_url?,
     *   cliente_origen_id?, cliente_destino_id?,
     *   categoria?, destino_externo?,
     *   horometro?,
     *   numero_acta?, numero_guia_despacho?,
     *   movimiento_padre_id?, equipo_relacionado_id?
     * }
     *
     * El RPC en la BD tiene DEFAULT NULL para los params opcionales,
     * así que se envían todos (con null los que no apliquen).
     *
     * Si el payload original tenía `fotoFile` (binario), InventarioView lo
     * descarta ANTES de encolar (no guardamos binarios en IDB) y bloquea
     * el submit offline. Por eso `p_foto_url` aquí siempre será null
     * en operaciones encoladas: si el usuario quería actualizar la
     * foto, debe esperar a tener red.
     *
     * Fase 2: las mutaciones de SWAP nunca llegan a esta cola. El padre
     * bloquea el submit offline con un toast ("requiere conexión") porque
     * la pierna 2 del swap depende del `padre.id` que retorna la pierna 1.
     */
    async movimiento({ payload }) {
        if (!supabase) throw new Error("Supabase no configurado");
        const { error } = await supabase.rpc("registrar_movimiento", {
            p_equipo_id: payload.equipo_id,
            p_motivo: payload.motivo,
            p_bodega_destino: payload.bodega_destino ?? null,
            p_responsable: payload.responsable,
            p_bodega_origen: payload.bodega_origen ?? null,
            p_ubicacion_origen: payload.ubicacion_origen ?? null,
            p_ubicacion_destino: payload.ubicacion_destino ?? null,
            p_notas: payload.notas ?? null,
            p_horometro: payload.horometro ?? null,
            p_numero_acta: payload.numero_acta ?? null,
            p_numero_guia_despacho: payload.numero_guia_despacho ?? null,
            p_foto_url: payload.p_foto_url ?? null,
            p_cliente_origen_id: payload.cliente_origen_id ?? null,
            p_cliente_destino_id: payload.cliente_destino_id ?? null,
            p_categoria: payload.categoria ?? null,
            p_destino_externo: payload.destino_externo ?? null,
            p_movimiento_padre_id: payload.movimiento_padre_id ?? null,
            p_equipo_relacionado_id: payload.equipo_relacionado_id ?? null,
        });
        if (error) throw error;
    },

    /**
     * payload: { id }
     * Edge function: notifica por email al admin.
     * Si falla, retorna { skip: true } para no reintentar.
     */
    async notify_delete({ payload }) {
        if (!supabase) return { skip: true };
        try {
            const { error } = await supabase.functions.invoke(
                "notify-delete",
                { body: { id: payload.id } },
            );
            if (error) return { skip: true };
        } catch {
            return { skip: true };
        }
        return { skip: true }; // éxito o fallo, no reintentamos
    },
};

// Mantenimiento de la cola que NUNCA interrumpe el flush: si el
// borrado/reintento en IDB falla, se loguea y se sigue con el
// siguiente item (quedará pendiente para el próximo flush).
async function safeRemove(id) {
    try {
        await removePendingWrite(id);
    } catch (err) {
        console.warn("[offlineQueue] removePendingWrite falló:", err);
    }
}

async function safeRetry(id) {
    try {
        await incrementPendingRetry(id);
    } catch (err) {
        console.warn("[offlineQueue] incrementPendingRetry falló:", err);
    }
}

/**
 * Vuelca la cola contra Supabase.
 *
 * @param {{ onProgress?: (info: { flushed: number, failed: number, skipped: number, total: number }) => void }} [opts]
 * @returns {Promise<{ flushed: number, failed: number, skipped: number }>}
 */
export async function flushQueue(opts = {}) {
    if (!navigator.onLine) {
        return { flushed: 0, failed: 0, skipped: 0 };
    }

    const pending = await getPendingWrites();
    const total = pending.length;
    let flushed = 0;
    let failed = 0;
    let skipped = 0;

    for (const item of pending) {
        // Una operación offline pertenece al usuario que la creó. Nunca debe
        // quedar registrada a nombre de otra persona que use el mismo equipo.
        if (item.userId && item.userId !== opts.userId) {
            skipped++;
            if (opts.onProgress) {
                opts.onProgress({ flushed, failed, skipped, total });
            }
            continue;
        }
        const handler = HANDLERS[item.type];
        if (!handler) {
            // Tipo desconocido: descartar sin reintentar
            await safeRemove(item.id);
            skipped++;
        } else {
            try {
                const result = await handler(item);
                // Handler OK: solo aquí se borra de la cola. Si el
                // borrado falla, safeRemove lo loguea y el item se
                // reintentará en el próximo flush (no aborta la cola).
                await safeRemove(item.id);
                if (result?.skip) {
                    skipped++;
                } else {
                    flushed++;
                }
            } catch (err) {
                const isTransient = esErrorTransitorio(err);
                if (!isTransient || item.retries >= MAX_RETRIES) {
                    // Descartamos: no es recuperable o se acabaron los reintentos
                    await safeRemove(item.id);
                    failed++;
                    console.error(
                        `[offlineQueue] descartando ${item.type}:`,
                        err,
                    );
                } else {
                    await safeRetry(item.id);
                    failed++;
                }
            }
        }

        if (opts.onProgress) {
            opts.onProgress({ flushed, failed, skipped, total });
        }
    }

    return { flushed, failed, skipped };
}

function esErrorTransitorio(err) {
    const msg = String(err?.message || err || "").toLowerCase();
    if (
        msg.includes("network") ||
        msg.includes("fetch") ||
        msg.includes("timeout") ||
        msg.includes("failed to fetch")
    ) {
        return true;
    }
    // 5xx o 429
    const status = err?.status ?? err?.context?.status;
    if (status && (status >= 500 || status === 429)) return true;
    return false;
}
