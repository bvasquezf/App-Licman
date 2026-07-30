/**
 * equiposStorage
 * --------------
 * Wrappers de Supabase Storage para el bucket `equipos-fotos` (privado).
 *
 * Convención de path:
 *   {correlativo:04d}_{timestamp}.{ext}
 *   ej. 0042_1735627800123.jpg
 *
 * El bucket está privado: las fotos se acceden via signed URLs con
 * expiración corta (1h por default).
 */

import { supabase } from "../services/supabase";

const BUCKET = "equipos-fotos";

/**
 * Sube una foto al bucket y devuelve el path resultante.
 *
 * @param {File} file - Imagen seleccionada por el usuario.
 * @param {number} correlativo - Correlativo del equipo (para naming).
 * @returns {Promise<string>} path del archivo en Storage.
 */
export async function uploadFotoEquipo(file, correlativo) {
    if (!supabase) throw new Error("Supabase no configurado");
    if (!file) throw new Error("Archivo inválido");

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const allowed = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
    if (!allowed.includes(ext)) {
        throw new Error(`Formato no soportado: .${ext}`);
    }

    const safeCorr = Math.max(1, Number(correlativo) || 1);
    const path = `${String(safeCorr).padStart(4, "0")}_${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
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
async function deleteFotoEquipo(path) {
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
 * @param {number} correlativo - Correlativo del equipo (path naming)
 * @param {string|null} oldPath - Path anterior (si había foto)
 * @returns {Promise<string>} path nuevo
 */
export async function replaceFotoEquipo(file, correlativo, oldPath) {
    const newPath = await uploadFotoEquipo(file, correlativo);
    if (oldPath && oldPath !== newPath) {
        try {
            await deleteFotoEquipo(oldPath);
        } catch (err) {
            // No bloquear el flujo principal por un huérfano
            // eslint-disable-next-line no-console
            console.warn(
                `[equiposStorage] No se pudo borrar foto anterior ${oldPath}:`,
                err?.message ?? err,
            );
        }
    }
    return newPath;
}
