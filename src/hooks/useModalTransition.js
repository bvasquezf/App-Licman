import { useEffect, useRef, useState } from "react";

const DURACION_SALIDA_MS = 240;

/**
 * Mantiene un modal montado durante su animación de salida.
 * El componente padre puede cambiar `open` a false inmediatamente:
 * el contenido se desmonta recién al terminar la transición.
 */
export function useModalTransition(open) {
    const [presente, setPresente] = useState(open);

    useEffect(() => {
        if (open) {
            setPresente(true);
            return undefined;
        }
        if (!presente) return undefined;

        const reducirMovimiento = window.matchMedia?.(
            "(prefers-reduced-motion: reduce)",
        ).matches;
        const timeoutId = window.setTimeout(
            () => setPresente(false),
            reducirMovimiento ? 0 : DURACION_SALIDA_MS,
        );
        return () => window.clearTimeout(timeoutId);
    }, [open, presente]);

    const cerrando = !open && presente;

    return {
        renderizar: open || presente,
        cerrando,
        claseFondo: cerrando
            ? "animate-modal-fondo-out"
            : "animate-modal-fondo-in",
        clasePanel: cerrando
            ? "animate-modal-panel-out"
            : "animate-modal-panel-in",
        claseImagen: cerrando
            ? "animate-modal-imagen-out"
            : "animate-modal-imagen-in",
    };
}

/**
 * Conserva props como `equipo` mientras el modal termina de salir.
 */
export function useRetainedValue(value, actualizar) {
    const valueRef = useRef(value);
    if (actualizar) valueRef.current = value;
    return actualizar ? value : valueRef.current;
}
