import { datosCategoriaRequerimiento } from "../../lib/tareasData";

export default function RequerimientoBadge({ categoria, compacta = false }) {
    const datos = datosCategoriaRequerimiento(categoria);

    return (
        <span
            className={`inline-flex items-center rounded-full bg-blue-50 font-bold text-blue-800 ring-1 ring-blue-200/70 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20 ${
                compacta ? "gap-1 px-2 py-0.5 text-xs" : "gap-1.5 px-2.5 py-1 text-xs"
            }`}
        >
            <span aria-hidden="true">{datos.icono}</span>
            {datos.etiqueta}
        </span>
    );
}
