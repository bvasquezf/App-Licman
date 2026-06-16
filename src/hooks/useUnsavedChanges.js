// Hook para advertir al usuario antes de abandonar la página con
// cambios sin guardar. Solo usa beforeunload (sin localStorage drafts).

import { useEffect, useRef } from "react";

/**
 * @param {any|Array<any>} formData - Estado del form (o array de estados).
 *   Si pasa array, se mira en conjunto. Solo se considera dirty si al
 *   menos UNO de los valores trackeados no está vacío.
 * @param {Object} [options]
 * @param {boolean} [options.habilitado=true] - Permite activar/desactivar.
 *
 * El snapshot se captura en el PRIMER render. Esto es importante para
 * ProductoForm en modo edición: el snapshot debe tener los valores del
 * producto original, no los vacíos.
 */
export function useUnsavedChanges(formData, options = {}) {
    const { habilitado = true } = options;

    const values = Array.isArray(formData) ? formData : [formData];

    // Snapshot inmutable del primer render válido.
    const snapshotRef = useRef(null);
    if (snapshotRef.current === null) {
        snapshotRef.current = values.map(clonarValor);
    }

    useEffect(() => {
        if (!habilitado) return;

        const isDirty = calcularDirty(values, snapshotRef.current);
        if (!isDirty) return;

        const handler = (e) => {
            // Mostrar el prompt nativo del navegador.
            e.preventDefault();
            // Chrome requiere set returnValue.
            e.returnValue = "";
            return "";
        };

        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [values, habilitado]);
}

function clonarValor(v) {
    if (v == null) return v;
    try {
        return JSON.parse(JSON.stringify(v));
    } catch {
        return v;
    }
}

function calcularDirty(actual, snapshot) {
    if (actual.length !== snapshot.length) return false;
    let hasAnyValue = false;
    for (let i = 0; i < actual.length; i++) {
        if (tieneContenido(actual[i])) hasAnyValue = true;
        if (!sameValue(actual[i], snapshot[i])) {
            return hasAnyValue; // dirty si hay contenido + diferencia
        }
    }
    return false;
}

function tieneContenido(v) {
    if (v == null) return false;
    if (typeof v === "string") return v.trim() !== "";
    if (typeof v === "number") return !Number.isNaN(v);
    if (typeof v === "boolean") return true;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") {
        return Object.values(v).some(tieneContenido);
    }
    return false;
}

function sameValue(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;
    if (typeof a === "object") {
        try {
            return JSON.stringify(a) === JSON.stringify(b);
        } catch {
            return false;
        }
    }
    return false;
}
