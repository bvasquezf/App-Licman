import { useMemo } from "react";
import { BODEGAS, BODEGA_EN_CLIENTE } from "../../lib/equiposConstants";

/**
 * Resumen visual del inventario por ubicación (bodegas + "En cliente").
 * Cada mini-card actúa como filtro: un clic selecciona la ubicación y
 * otro clic sobre la card activa vuelve a mostrar todas.
 *
 * Props:
 *   equipos: array de equipos activos (sin papelera).
 *   activa:  valor actual del filtro ("todas" | bodega | BODEGA_EN_CLIENTE).
 *   onSelect: callback con el nuevo valor del filtro.
 */
export default function ResumenBodegas({ equipos, activa, onSelect }) {
    const resumen = useMemo(() => {
        const porUbicacion = new Map();
        for (const nombre of BODEGAS) {
            porUbicacion.set(nombre, {
                valor: nombre,
                nombre,
                total: 0,
                operativos: 0,
                inoperativos: 0,
            });
        }
        porUbicacion.set(BODEGA_EN_CLIENTE, {
            valor: BODEGA_EN_CLIENTE,
            nombre: "En cliente",
            total: 0,
            operativos: 0,
            inoperativos: 0,
        });
        for (const e of equipos) {
            // Misma lógica del filtro de ListView: si tiene cliente,
            // cuenta como "En cliente" aunque conserve bodega.
            const clave = e.cliente_id ? BODEGA_EN_CLIENTE : e.bodega;
            const r = porUbicacion.get(clave);
            if (!r) continue;
            r.total += 1;
            if (e.estado_operacional === "Operativo") r.operativos += 1;
            if (e.estado_operacional === "Inoperativo") r.inoperativos += 1;
        }
        return [...porUbicacion.values()];
    }, [equipos]);

    return (
        <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            role="group"
            aria-label="Resumen por ubicación"
        >
            {resumen.map((r) => {
                const esActiva = activa === r.valor;
                return (
                    <button
                        key={r.valor}
                        type="button"
                        onClick={() => onSelect(esActiva ? "todas" : r.valor)}
                        aria-pressed={esActiva}
                        className={`min-h-[44px] rounded-[12px] border-[1.5px] p-3 text-left transition ${
                            esActiva
                                ? "border-brand-600 bg-brand-50 ring-2 ring-brand-600/20 dark:border-brand-500 dark:bg-brand-500/10 dark:ring-brand-500/25"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-carbon-800 dark:hover:border-white/20 dark:hover:bg-white/5"
                        }`}
                    >
                        <p className="truncate text-[0.8rem] font-bold text-slate-700 dark:text-slate-200">
                            {r.valor === BODEGA_EN_CLIENTE ? "🏢 " : ""}
                            {r.nombre}
                        </p>
                        <p className="mt-1 text-[1.4rem] font-extrabold tabular-nums text-slate-900 dark:text-slate-100">
                            {r.total}
                        </p>
                        <p className="mt-1 flex flex-wrap gap-x-2 text-[0.75rem] font-semibold">
                            <span className="text-green-700 dark:text-green-400">
                                {r.operativos === 1
                                    ? "1 operativo"
                                    : `${r.operativos} operativos`}
                            </span>
                            <span className="text-red-700 dark:text-red-400">
                                {r.inoperativos === 1
                                    ? "1 inoperativo"
                                    : `${r.inoperativos} inoperativos`}
                            </span>
                        </p>
                    </button>
                );
            })}
        </div>
    );
}
