// Banner ámbar fijo en la parte superior que avisa al usuario cuando
// el navegador está sin conexión. Aparece/desaparece con transición.

import { useOnlineStatus } from "../../hooks/useOnlineStatus";

export default function OfflineBanner() {
    const online = useOnlineStatus();

    return (
        <div
            role="status"
            aria-live="polite"
            className={`pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center transition-all duration-300 ${
                online
                    ? "-translate-y-full opacity-0"
                    : "translate-y-0 opacity-100"
            }`}
        >
            <div className="mt-2 flex max-w-md items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-800 shadow-md dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-200 sm:text-sm">
                <span aria-hidden="true">⚠️</span>
                <span>
                    Sin conexión a internet. Los datos mostrados pueden estar
                    desactualizados.
                </span>
            </div>
        </div>
    );
}
