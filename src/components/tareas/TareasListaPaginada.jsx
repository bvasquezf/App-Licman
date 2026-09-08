import { useState } from "react";
import TareaCard from "./TareaCard";

export default function TareasListaPaginada({
    tareas,
    onEditar,
    onCambiarEstado,
    compacta = false,
    limiteInicial = 12,
    incremento = 12,
    className = "grid auto-rows-fr items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3",
}) {
    const [limite, setLimite] = useState(limiteInicial);
    const visibles = tareas.slice(0, limite);
    const restantes = Math.max(0, tareas.length - visibles.length);

    return (
        <>
            <div className={className}>
                {visibles.map((tarea) => (
                    <TareaCard
                        key={tarea.id}
                        tarea={tarea}
                        onEditar={onEditar}
                        onCambiarEstado={onCambiarEstado}
                        compacta={compacta}
                    />
                ))}
            </div>
            {restantes > 0 && (
                <div className="mt-3 flex justify-center">
                    <button
                        type="button"
                        onClick={() => setLimite((actual) => actual + incremento)}
                        className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-extrabold text-blue-700 hover:bg-blue-50 dark:border-white/15 dark:bg-carbon-900 dark:text-blue-300 dark:hover:bg-white/5"
                    >
                        Mostrar {Math.min(incremento, restantes)} más
                        <span className="ml-1 text-slate-500 dark:text-neutral-400">
                            ({restantes} pendientes)
                        </span>
                    </button>
                </div>
            )}
        </>
    );
}
