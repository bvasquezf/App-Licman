// Cache local (IndexedDB) de la planificación operativa de Tareas.
//
// Patrón stale-while-revalidate, igual que el cache de equipos: al entrar
// al módulo se muestra altiro la última planificación guardada mientras la
// red trae la versión fresca, que al llegar reemplaza al cache en pantalla
// y vuelve a guardarse.
//
// DB propia ("licman-tareas") para no colisionar con "bodega-licman-equipos"
// (ver offlineDb.js). Un solo store clave-valor; hoy solo se cachean las
// tareas operativas (activas + finalizadas de hoy), que es lo que gatilla
// el skeleton de "Cargando planificación…".

import { openDB } from "idb";

const DB_NAME = "licman-tareas";
const DB_VERSION = 1;
const STORE_CACHE = "cache";
const KEY_OPERATIVAS = "operativas";

let _dbPromise = null;

function getDB() {
    if (!_dbPromise) {
        _dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_CACHE)) {
                    db.createObjectStore(STORE_CACHE);
                }
            },
        });
    }
    return _dbPromise;
}

/**
 * Guarda las tareas operativas ya normalizadas, amarradas al usuario actual.
 * @param {string|null} userId - id del perfil (auth.uid).
 * @param {Array} tareas
 */
export async function guardarCacheTareasOperativas(userId, tareas) {
    if (!userId || !Array.isArray(tareas)) return;
    try {
        const db = await getDB();
        await db.put(
            STORE_CACHE,
            { userId, tareas, guardadoAt: new Date().toISOString() },
            KEY_OPERATIVAS,
        );
    } catch (err) {
        console.warn("[tareasCache] guardarCacheTareasOperativas falló:", err);
    }
}

/**
 * Lee el cache solo si pertenece al mismo usuario (evita mostrar datos de
 * otra cuenta tras cambiar de usuario en el mismo equipo).
 * @param {string|null} userId
 * @returns {Promise<Array|null>} tareas cacheadas o null si no hay cache usable.
 */
export async function leerCacheTareasOperativas(userId) {
    if (!userId) return null;
    try {
        const db = await getDB();
        const entrada = await db.get(STORE_CACHE, KEY_OPERATIVAS);
        if (!entrada || entrada.userId !== userId) return null;
        return Array.isArray(entrada.tareas) ? entrada.tareas : null;
    } catch (err) {
        console.warn("[tareasCache] leerCacheTareasOperativas falló:", err);
        return null;
    }
}
