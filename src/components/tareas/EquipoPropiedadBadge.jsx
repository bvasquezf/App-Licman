import { propiedadEquipoTarea } from "../../lib/tareasEquipo";

const CLASES = {
    Licman:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
    Cliente:
        "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300",
    "Por confirmar":
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    "Sin equipo":
        "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300",
};

export default function EquipoPropiedadBadge({ tarea, compacta = false }) {
    const propiedad = propiedadEquipoTarea(tarea);

    return (
        <span
            title={propiedad.descripcion}
            className={`inline-flex items-center gap-1 rounded-full border font-bold ${
                compacta ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
            } ${CLASES[propiedad.valor]}`}
        >
            <span aria-hidden="true">{propiedad.icono}</span>
            {propiedad.etiqueta}
        </span>
    );
}
