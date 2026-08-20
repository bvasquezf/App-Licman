/**
 * equiposStorage
 * --------------
 * Wrappers de Supabase Storage para el bucket `equipos-fotos` (privado).
 *
 * Convención de path:
 *   equipos/{equipo_id}/actual_{timestamp}_{aleatorio}.{ext}
 *   ej. equipos/2197/actual_1735627800123_a1b2c3.jpg
 *
 * El timestamp evita sobrescribir la foto vigente antes de que el RPC del
 * movimiento confirme. Después de confirmar, la aplicación elimina la ruta
 * anterior, por lo que queda una sola foto activa por equipo.
 *
 * El bucket está privado: las fotos se acceden via signed URLs con
 * expiración corta (1h por default).
 */

import { supabase } from "../services/supabase";
import { compressImage } from "./compressImage";

const BUCKET = "equipos-fotos";

/**
 * Sube una foto al bucket y devuelve el path resultante.
 *
 * Antes de subir, la foto pasa por `compressImage` (resize + JPEG en
 * el navegador): lo que viaja y se almacena es la versión optimizada
 * de ~300 KB, no el original de varios MB. Si la compresión no aplica
 * (formato no decodificable), se sube el archivo original.
 *
 * @param {File} file - Imagen seleccionada por el usuario.
 * @param {number|string} equipoId - ID estable del equipo (para naming).
 * @returns {Promise<string>} path del archivo en Storage.
 */
export async function uploadFotoEquipo(file, equipoId) {
    if (!supabase) throw new Error("Supabase no configurado");
    if (!file) throw new Error("Archivo inválido");

    const idTexto = String(equipoId ?? "").trim();
    if (!/^\d+$/.test(idTexto) || Number(idTexto) < 1) {
        throw new Error("ID de equipo inválido para guardar la foto");
    }

    const optimizada = await compressImage(file);

    const ext = (optimizada.name.split(".").pop() || "jpg").toLowerCase();
    const allowed = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
    if (!allowed.includes(ext)) {
        throw new Error(`Formato no soportado: .${ext}`);
    }

    const sufijo = Math.random().toString(36).slice(2, 8);
    const path = `equipos/${idTexto}/actual_${Date.now()}_${sufijo}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, optimizada, {
        cacheControl: "3600",
        upsert: false,
        contentType: optimizada.type || undefined,
    });

    if (error) throw error;
    return path;
}

/**
 * Genera una URL firmada para un path existente.
 * Si no hay path, devuelve null.
 *
 * @param {string|null} path
 * @param {number} [expiresIn=3600] - Segundos hasta expirar.
 * @returns {Promise<string|null>}
 */
async function getFotoUrl(path, expiresIn = 3600) {
    if (!supabase) return null;
    if (!path) return null;
    try {
        const { data, error } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(path, expiresIn);
        if (error) return null;
        return data?.signedUrl ?? null;
    } catch {
        return null;
    }
}

/**
 * Borra una foto del bucket (por path).
 *
 * @param {string} path
 */
export async function deleteFotoEquipo(path) {
    if (!supabase) throw new Error("Supabase no configurado");
    if (!path) return;
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
}

/**
 * Cache en memoria para signed URLs. Map<path, { url, expiresAt }>.
 * Se invalida al recargar la página. Las URLs expiran en 1h, así que
 * cacheamos también el timestamp de expiración para renovar antes.
 *
 * Como las fotos son privadas, pedir signed URL a Supabase en cada
 * render sería carísimo (N requests por página). Esta cache evita
 * repetir requests cuando el mismo equipo se ve varias veces
 * (ej: lista + filtros + paginación).
 */
const _urlCache = new Map();

function _cacheGet(path) {
    const entry = _urlCache.get(path);
    if (!entry) return null;
    // 5 min de margen antes de expirar para no servir URLs muertas
    if (Date.now() >= entry.expiresAt - 5 * 60 * 1000) {
        _urlCache.delete(path);
        return null;
    }
    return entry.url;
}

function _cacheSet(path, url, ttlSeconds) {
    _urlCache.set(path, {
        url,
        expiresAt: Date.now() + ttlSeconds * 1000,
    });
}

/**
 * Devuelve una signed URL para `path`. Cachea en memoria para evitar
 * pedir la misma URL repetidamente.
 *
 * @param {string|null} path
 * @param {number} [expiresIn=3600]
 * @returns {Promise<string|null>}
 */
export async function getFotoUrlCached(path, expiresIn = 3600) {
    if (!path) return null;
    const cached = _cacheGet(path);
    if (cached) return cached;
    const url = await getFotoUrl(path, expiresIn);
    if (url) _cacheSet(path, url, expiresIn);
    return url;
}

/**
 * Sube una foto nueva y (best-effort) borra la anterior.
 *
 * Patrón para UPDATE de foto: el llamador ya tiene el `oldPath` (de
 * `equipos.foto_url` antes del cambio). Si el upload de la nueva
 * tiene éxito, intentamos borrar la vieja — si falla la borrada, la
 * nueva ya quedó guardada y seguimos (log warning, no rompemos el
 * flujo del usuario).
 *
 * El borrado es best-effort para evitar que un archivo huérfano
 * bloquee una actualización legítima. Los archivos huérfanos se
 * pueden limpiar después con una cron SQL / Edge Function.
 *
 * @param {File} file
 * @param {number|string} equipoId - ID estable del equipo (path naming)
 * @param {string|null} oldPath - Path anterior (si había foto)
 * @returns {Promise<string>} path nuevo
 */
export async function replaceFotoEquipo(file, equipoId, oldPath) {
    const newPath = await uploadFotoEquipo(file, equipoId);
    if (oldPath && oldPath !== newPath) {
        try {
            await deleteFotoEquipo(oldPath);
        } catch (err) {
            // No bloquear el flujo principal por un huérfano
             
            console.warn(
                `[equiposStorage] No se pudo borrar foto anterior ${oldPath}:`,
                err?.message ?? err,
            );
        }
    }
    return newPath;
}
