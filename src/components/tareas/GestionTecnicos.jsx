import { useMemo, useState } from "react";
import { estaTareaActiva } from "../../lib/tareasData";

export default function GestionTecnicos({
    tecnicos,
    tareas,
    onCrear,
    onCambiarActivo,
}) {
    const [nombre, setNombre] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [procesandoNombre, setProcesandoNombre] = useState(null);
    const [mostrarInactivos, setMostrarInactivos] = useState(false);

    const cargaActiva = useMemo(() => {
        const conteo = new Map();
        for (const tarea of tareas.filter(estaTareaActiva)) {
            for (const tecnico of tarea.tecnicos ?? []) {
                conteo.set(tecnico, (conteo.get(tecnico) ?? 0) + 1);
            }
        }
        return conteo;
    }, [tareas]);

    const activos = tecnicos.filter((tecnico) => tecnico.activo);
    const inactivos = tecnicos.filter((tecnico) => !tecnico.activo);
    const visibles = mostrarInactivos ? tecnicos : activos;

    const crear = async (event) => {
        event.preventDefault();
        const limpio = nombre.trim();
        if (!limpio || guardando) return;
        setGuardando(true);
        try {
            const creado = await onCrear(limpio);
            if (creado) setNombre("");
        } finally {
            setGuardando(false);
        }
    };

    const cambiarActivo = async (tecnico) => {
        const siguiente = !tecnico.activo;
        if (
            !siguiente &&
            !window.confirm(
                `¿Eliminar a ${tecnico.nombre} del equipo técnico? Su historial se conservará y podrás reactivarlo después.`,
            )
        ) {
            return;
        }
        setProcesandoNombre(tecnico.nombre);
        try {
            await onCambiarActivo(tecnico.nombre, siguiente);
        } finally {
            setProcesandoNombre(null);
        }
    };

    return (
        <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-carbon-900">
            <header className="border-b border-slate-200 p-4 dark:border-white/10 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 className="text-lg font-black text-slate-950 dark:text-white">
                            Equipo técnico
                        </h2>
                        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-neutral-400">
                            Agrega técnicos o retíralos de la planificación. Al
                            eliminarlos se desactivan para conservar sus trabajos
                            anteriores.
                        </p>
                    </div>
                    <form
                        onSubmit={crear}
                        className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto]"
                    >
                        <label>
                            <span className="sr-only">
                                Nombre del técnico nuevo
                            </span>
                            <input
                                type="text"
                                value={nombre}
                                onChange={(event) =>
                                    setNombre(event.target.value)
                                }
                                placeholder="Nombre del técnico"
                                className="min-h-[48px] w-full rounded-xl border-[1.5px] border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100"
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={!nombre.trim() || guardando}
                            className="min-h-[48px] rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {guardando ? "Agregando…" : "+ Agregar técnico"}
                        </button>
                    </form>
                </div>
            </header>

            <div className="p-4 sm:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        {activos.length} técnico{activos.length === 1 ? "" : "s"}{" "}
                        activo{activos.length === 1 ? "" : "s"}
                    </p>
                    {inactivos.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setMostrarInactivos((actual) => !actual)}
                            className="min-h-[44px] rounded-xl px-3 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
                        >
                            {mostrarInactivos
                                ? "Ocultar inactivos"
                                : `Ver inactivos (${inactivos.length})`}
                        </button>
                    )}
                </div>

                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {visibles.map((tecnico) => {
                        const asignadas = cargaActiva.get(tecnico.nombre) ?? 0;
                        const procesando = procesandoNombre === tecnico.nombre;
                        return (
                            <article
                                key={tecnico.nombre}
                                className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                                    tecnico.activo
                                        ? "border-slate-200 bg-slate-50/60 dark:border-white/10 dark:bg-white/[0.025]"
                                        : "border-dashed border-slate-300 bg-slate-100/70 opacity-80 dark:border-white/15 dark:bg-white/5"
                                }`}
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-100">
                                        {tecnico.nombre}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                                        {tecnico.activo
                                            ? `${asignadas} tarea${asignadas === 1 ? "" : "s"} activa${asignadas === 1 ? "" : "s"}`
                                            : "Inactivo · historial conservado"}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => cambiarActivo(tecnico)}
                                    disabled={
                                        procesando ||
                                        (tecnico.activo && asignadas > 0)
                                    }
                                    title={
                                        tecnico.activo && asignadas > 0
                                            ? "Reasigna primero sus tareas activas"
                                            : undefined
                                    }
                                    className={`min-h-[44px] shrink-0 rounded-xl px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                                        tecnico.activo
                                            ? "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300"
                                            : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300"
                                    }`}
                                >
                                    {procesando
                                        ? "Guardando…"
                                        : tecnico.activo
                                          ? asignadas > 0
                                              ? "Con tareas"
                                              : "Eliminar"
                                          : "Reactivar"}
                                </button>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
