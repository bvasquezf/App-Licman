// Wrapper de IndexedDB para Inventario de Equipos.
//
// Namespace: "bodega-licman-equipos". Si en el futuro la bodega
// también quiere usar offline, debe usar otro DB name (ej:
// "bodega-licman-repuestos") para no colisionar.
//
// Stores:
//   - equipos: cache de los últimos equipos cargados (key: id)
//   - pendingWrites: cola de mutaciones pendientes (auto-increment id)

import { openDB } from "idb";

const DB_NAME = "bodega-licman-equipos";
// v2: pendingWrites pasa a keyPath "id" (antes las keys eran out-of-line
// y los registros NO tenían id embebido → la cola no podía borrar lo
// procesado y cada flush duplicaba en el servidor).
const DB_VERSION = 2;
const STORE_EQUIPOS = "equipos";
const STORE_PENDING = "pendingWrites";

let _dbPromise = null;

function getDB() {
    if (!_dbPromise) {
        _dbPromise = openDB(DB_NAME, DB_VERSION, {
            async upgrade(db, oldVersion, _newVersion, tx) {
                if (!db.objectStoreNames.contains(STORE_EQUIPOS)) {
                    db.createObjectStore(STORE_EQUIPOS, { keyPath: "id" });
                }

                if (
                    oldVersion >= 1 &&
                    oldVersion < 2 &&
                    db.objectStoreNames.contains(STORE_PENDING)
                ) {
                    // Migración v1→v2: leer pendientes con sus keys,
                    // recrear el store con keyPath y reinsertarlos
                    // preservando el id (así el auto-increment queda
                    // por sobre el mayor id existente y no colisiona).
                    const oldStore = tx.objectStore(STORE_PENDING);
                    const values = await oldStore.getAll();
                    const keys = await oldStore.getAllKeys();
                    db.deleteObjectStore(STORE_PENDING);
                    const newStore = db.createObjectStore(STORE_PENDING, {
                        keyPath: "id",
                        autoIncrement: true,
                    });
                    for (let i = 0; i < values.length; i++) {
                        await newStore.put({ ...values[i], id: keys[i] });
                    }
                    return;
                }

                if (!db.objectStoreNames.contains(STORE_PENDING)) {
                    db.createObjectStore(STORE_PENDING, {
                        keyPath: "id",
                        autoIncrement: true,
                    });
                }
            },
        });
    }
    return _dbPromise;
}

/* ---------------------------------------------------------------- *
 * Cache de equipos
 * ---------------------------------------------------------------- */

export async function cacheEquipos(equipos) {
    if (!Array.isArray(equipos)) return;
    try {
        const db = await getDB();
        const tx = db.transaction(STORE_EQUIPOS, "readwrite");
        await tx.store.clear();
        for (const e of equipos) {
            await tx.store.put(e);
        }
        await tx.done;
    } catch (err) {
        console.warn("[offlineDb] cacheEquipos falló:", err);
    }
}

export async function getCachedEquipos() {
    try {
        const db = await getDB();
        return await db.getAll(STORE_EQUIPOS);
    } catch (err) {
        console.warn("[offlineDb] getCachedEquipos falló:", err);
        return [];
    }
}

/* ---------------------------------------------------------------- *
 * Cola de mutaciones pendientes
 * ---------------------------------------------------------------- */

/**
 * Encola una mutación para flush posterior cuando vuelva la conexión.
 * @param {{ type: string, payload: any }} item
 * @returns {Promise<number>} id asignado en la cola
 */
export async function enqueuePendingWrite(item) {
    if (!item || !item.type) {
        throw new Error("enqueuePendingWrite: item.type es requerido");
    }
    const db = await getDB();
    const entry = {
        type: item.type,
        payload: item.payload,
        createdAt: new Date().toISOString(),
        retries: 0,
    };
    return await db.add(STORE_PENDING, entry);
}

export async function getPendingWrites() {
    try {
        const db = await getDB();
        // FIFO por id auto-increment
        const all = await db.getAll(STORE_PENDING);
        return all.sort((a, b) => a.id - b.id);
    } catch (err) {
        console.warn("[offlineDb] getPendingWrites falló:", err);
        return [];
    }
}

export async function getPendingCount() {
    try {
        const db = await getDB();
        return await db.count(STORE_PENDING);
    } catch {
        return 0;
    }
}

export async function removePendingWrite(id) {
    if (id == null) return; // registro corrupto sin id: no-op, nunca tirar DataError
    const db = await getDB();
    await db.delete(STORE_PENDING, id);
}

export async function incrementPendingRetry(id) {
    if (id == null) return;
    const db = await getDB();
    const tx = db.transaction(STORE_PENDING, "readwrite");
    const entry = await tx.store.get(id);
    if (entry) {
        entry.retries = (entry.retries || 0) + 1;
        await tx.store.put(entry, id);
    }
    await tx.done;
}