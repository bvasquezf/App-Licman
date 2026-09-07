import { useEffect, useRef } from "react";

const dialogStack = [];
let estilosScrollDocumento = null;

function bloquearScrollDocumento() {
    if (estilosScrollDocumento || typeof document === "undefined") return;

    estilosScrollDocumento = {
        htmlOverflow: document.documentElement.style.overflow,
        bodyOverflow: document.body.style.overflow,
        bodyPaddingRight: document.body.style.paddingRight,
    };

    const anchoScrollbar =
        window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (anchoScrollbar > 0) {
        document.body.style.paddingRight = `${anchoScrollbar}px`;
    }
}

function restaurarScrollDocumento() {
    if (!estilosScrollDocumento || dialogStack.length > 0) return;

    document.documentElement.style.overflow = estilosScrollDocumento.htmlOverflow;
    document.body.style.overflow = estilosScrollDocumento.bodyOverflow;
    document.body.style.paddingRight = estilosScrollDocumento.bodyPaddingRight;
    estilosScrollDocumento = null;
}

const FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled]):not([type='hidden'])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusablesDentro(elemento) {
    return [...elemento.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
        (nodo) =>
            nodo.getAttribute("aria-hidden") !== "true" &&
            nodo.getClientRects().length > 0,
    );
}

/**
 * Maneja el teclado y el foco de un diálogo sin depender de librerías.
 * Solo el último diálogo abierto responde a Escape, lo que evita cerrar
 * también el modal padre cuando existe un modal anidado.
 */
export function useDialogA11y(
    open,
    { dialogRef, onClose, bloquearCierre = false } = {},
) {
    const onCloseRef = useRef(onClose);
    const bloquearRef = useRef(bloquearCierre);

    onCloseRef.current = onClose;
    bloquearRef.current = bloquearCierre;

    useEffect(() => {
        if (!open || !dialogRef?.current) return undefined;

        const entrada = { element: dialogRef.current };
        const focoAnterior = document.activeElement;
        dialogStack.push(entrada);
        bloquearScrollDocumento();

        const frame = window.requestAnimationFrame(() => {
            const preferido = entrada.element.querySelector(
                "[data-dialog-autofocus]",
            );
            const primero = focusablesDentro(entrada.element)[0];
            (preferido || primero || entrada.element).focus?.({
                preventScroll: true,
            });
        });

        const manejarTeclado = (event) => {
            if (dialogStack.at(-1) !== entrada) return;

            if (event.key === "Escape") {
                if (!bloquearRef.current) {
                    event.preventDefault();
                    event.stopPropagation();
                    onCloseRef.current?.();
                }
                return;
            }

            if (event.key !== "Tab") return;
            const focusables = focusablesDentro(entrada.element);
            if (focusables.length === 0) {
                event.preventDefault();
                entrada.element.focus();
                return;
            }

            const primero = focusables[0];
            const ultimo = focusables[focusables.length - 1];
            if (event.shiftKey && document.activeElement === primero) {
                event.preventDefault();
                ultimo.focus();
            } else if (!event.shiftKey && document.activeElement === ultimo) {
                event.preventDefault();
                primero.focus();
            }
        };

        document.addEventListener("keydown", manejarTeclado, true);
        return () => {
            window.cancelAnimationFrame(frame);
            document.removeEventListener("keydown", manejarTeclado, true);
            const indice = dialogStack.indexOf(entrada);
            if (indice >= 0) dialogStack.splice(indice, 1);
            restaurarScrollDocumento();
            if (focoAnterior instanceof HTMLElement && focoAnterior.isConnected) {
                focoAnterior.focus({ preventScroll: true });
            }
        };
    }, [dialogRef, open]);
}
