// Hook para animar números: cuando `target` cambia, el valor mostrado
// "cuenta" desde el valor anterior hasta el nuevo con ease-out cúbico.
// Respeta prefers-reduced-motion (salta directo al valor final).

import { useEffect, useRef, useState } from "react";

/**
 * @param {number} target - Valor numérico final.
 * @param {Object} [options]
 * @param {number} [options.duration=700] - Duración de la animación (ms).
 * @param {(n: number) => string} [options.format] - Formateador del valor
 *   intermedio/final. Por defecto: entero con separador de miles es-CL.
 * @returns {string} Valor formateado listo para renderizar.
 */
export function useCountUp(target, { duration = 700, format } = {}) {
    const formatFn = format ?? ((n) => Math.round(n).toLocaleString("es-CL"));
    const [display, setDisplay] = useState(() => formatFn(target));
    const fromRef = useRef(target);

    useEffect(() => {
        const from = fromRef.current;
        const to = target;
        if (from === to) {
            setDisplay(formatFn(to));
            return undefined;
        }
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            fromRef.current = to;
            setDisplay(formatFn(to));
            return undefined;
        }
        let raf;
        const start = performance.now();
        const tick = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplay(formatFn(from + (to - from) * eased));
            if (t < 1) {
                raf = requestAnimationFrame(tick);
            } else {
                fromRef.current = to;
            }
        };
        raf = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(raf);
            fromRef.current = to;
        };
        // formatFn se deriva de `format` (referencia estable en los callers)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target, duration, format]);

    return display;
}
