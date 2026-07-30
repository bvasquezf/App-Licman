import { ESTADO_CHIP } from "../../lib/equiposConstants";

const COLORES = {
    Operativo: "bg-emerald-100 text-emerald-700",
    "Operativo con observaciones": "bg-amber-100 text-amber-700",
    Inoperativo: "bg-rose-100 text-rose-700",
};

export default function EstadoBadge({ estado }) {
    const clases = COLORES[estado] ?? "bg-slate-100 text-slate-700";
    const texto = ESTADO_CHIP[estado] ?? estado ?? "—";
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide ${clases}`}
        >
            {texto}
        </span>
    );
}