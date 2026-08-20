import { ESTADO_CHIP } from "../../lib/equiposConstants";

const COLORES = {
    Operativo:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    "Operativo con observaciones":
        "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    Inoperativo:
        "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
};

export default function EstadoBadge({ estado }) {
    const clases =
        COLORES[estado] ??
        "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200";
    const texto = ESTADO_CHIP[estado] ?? estado ?? "—";
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${clases}`}
        >
            {texto}
        </span>
    );
}