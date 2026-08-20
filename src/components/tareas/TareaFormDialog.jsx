import { useEffect, useMemo, useRef, useState } from "react";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { useModalTransition } from "../../hooks/useModalTransition";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import {
    ESTADOS_TAREA,
    PRIORIDADES_TAREA,
    TIPOS_TAREA,
    fechaLocalISO,
    formatearFechaTarea,
} from "../../lib/tareasData";

const INPUT_CLASES =
    "mt-1 block min-h-[44px] w-full rounded-xl border-[1.5px] border-slate-300 bg-white px-3 py-2.5 text-base font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100 dark:placeholder-neutral-500";

function valoresIniciales(tarea) {
    return {
        id: tarea?.id ?? null,
        titulo: tarea?.titulo ?? "",
        descripcion: tarea?.descripcion ?? "",
        tipo: tarea?.tipo ?? "Taller",
        estado: tarea?.estado ?? "Pendiente",
        prioridad: tarea?.prioridad ?? "Normal",
        fecha_programada: tarea?.fecha_programada ?? fechaLocalISO(),
        hora_inicio: tarea?.hora_inicio
            ? String(tarea.hora_inicio).slice(0, 5)
            : "",
        hora_fin: tarea?.hora_fin ? String(tarea.hora_fin).slice(0, 5) : "",
        cliente_id: tarea?.cliente_id ?? null,
        cliente_nombre: tarea?.cliente_nombre ?? "",
        ubicacion: tarea?.ubicacion ?? "",
        contacto: tarea?.contacto ?? "",
        equipo_referencia: tarea?.equipo_referencia ?? "",
        observaciones: tarea?.observaciones ?? "",
        tecnicos: tarea?.tecnicos ?? [],
    };
}

export default function TareaFormDialog({
    open,
    tarea,
    tareas,
    tecnicos,
    clientes,
    onClose,
    onGuardar,
    onCrearTecnico,
}) {
    const transicion = useModalTransition(open);
    const dialogRef = useRef(null);
    const refs = useRef({});
    const inicialRef = useRef(valoresIniciales(tarea));
    const abiertoAnteriorRef = useRef(false);
    const [form, setForm] = useState(() => valoresIniciales(tarea));
    const [versionFormulario, setVersionFormulario] = useState(0);
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(false);
    const [nuevoTecnico, setNuevoTecnico] = useState("");
    const [creandoTecnico, setCreandoTecnico] = useState(false);
    const [tecnicosLocales, setTecnicosLocales] = useState([]);

    useEffect(() => {
        if (open && !abiertoAnteriorRef.current) {
            const inicial = valoresIniciales(tarea);
            inicialRef.current = inicial;
            setForm(inicial);
            setErrores({});
            setGuardando(false);
            setNuevoTecnico("");
            setTecnicosLocales(
                [
                    ...new Set([
                        ...tecnicos
                            .filter((tecnico) => tecnico.activo)
                            .map((tecnico) => tecnico.nombre),
                        ...inicial.tecnicos,
                    ]),
                ].sort((a, b) => a.localeCompare(b, "es")),
            );
            setVersionFormulario((version) => version + 1);
        }
        abiertoAnteriorRef.current = open;
    }, [open, tarea, tecnicos]);

    useUnsavedChanges(form, {
        habilitado: open && !guardando,
        resetKey: `${tarea?.id ?? "nueva"}-${versionFormulario}`,
    });

    const conflictos = useMemo(() => {
        if (!form.fecha_programada || form.tecnicos.length === 0) return [];
        return tareas
            .filter(
                (otra) =>
                    otra.id !== form.id &&
                    otra.fecha_programada === form.fecha_programada &&
                    ["Pendiente", "En proceso"].includes(otra.estado) &&
                    otra.tecnicos?.some((nombre) =>
                        form.tecnicos.includes(nombre),
                    ),
            )
            .slice(0, 5);
    }, [form.fecha_programada, form.id, form.tecnicos, tareas]);

    const estaSucio = () =>
        JSON.stringify(form) !== JSON.stringify(inicialRef.current);

    const intentarCerrar = (forzado = false) => {
        if (guardando && !forzado) return;
        if (
            !forzado &&
            estaSucio() &&
            !window.confirm("Tienes cambios sin guardar. ¿Quieres cerrar igual?")
        ) {
            return;
        }
        onClose();
    };

    useDialogA11y(open, {
        dialogRef,
        onClose: intentarCerrar,
        bloquearCierre: guardando,
    });

    if (!transicion.renderizar) return null;

    const cambiar = (campo, valor) => {
        setForm((prev) => ({ ...prev, [campo]: valor }));
        if (errores[campo]) {
            setErrores((prev) => {
                const next = { ...prev };
                delete next[campo];
                return next;
            });
        }
    };

    const cambiarCliente = (valor) => {
        const encontrado = clientes.find(
            (cliente) =>
                cliente.razon_social.toLocaleLowerCase("es") ===
                valor.trim().toLocaleLowerCase("es"),
        );
        setForm((prev) => ({
            ...prev,
            cliente_nombre: valor,
            cliente_id: encontrado?.id ?? null,
            ubicacion:
                encontrado && !prev.ubicacion
                    ? [encontrado.direccion, encontrado.comuna]
                          .filter(Boolean)
                          .join(", ")
                    : prev.ubicacion,
            contacto:
                encontrado && !prev.contacto
                    ? [encontrado.contacto, encontrado.celular]
                          .filter(Boolean)
                          .join(" · ")
                    : prev.contacto,
        }));
    };

    const alternarTecnico = (nombre) => {
        setForm((prev) => ({
            ...prev,
            tecnicos: prev.tecnicos.includes(nombre)
                ? prev.tecnicos.filter((actual) => actual !== nombre)
                : [...prev.tecnicos, nombre],
        }));
    };

    const agregarTecnico = async () => {
        const limpio = nuevoTecnico.trim();
        if (!limpio || creandoTecnico) return;
        setCreandoTecnico(true);
        try {
            const creado = await onCrearTecnico(limpio);
            if (!creado) return;
            setTecnicosLocales((prev) =>
                prev.includes(creado) ? prev : [...prev, creado].sort(),
            );
            setForm((prev) => ({
                ...prev,
                tecnicos: prev.tecnicos.includes(creado)
                    ? prev.tecnicos
                    : [...prev.tecnicos, creado],
            }));
            setNuevoTecnico("");
        } finally {
            setCreandoTecnico(false);
        }
    };

    const enviar = async (event) => {
        event.preventDefault();
        const nextErrores = {};
        if (!form.titulo.trim()) {
            nextErrores.titulo = "Escribe qué trabajo hay que realizar";
        }
        if (
            form.hora_inicio &&
            form.hora_fin &&
            form.hora_fin <= form.hora_inicio
        ) {
            nextErrores.hora_fin = "La hora de término debe ser posterior";
        }
        if (Object.keys(nextErrores).length > 0) {
            setErrores(nextErrores);
            refs.current[Object.keys(nextErrores)[0]]?.focus();
            return;
        }

        setGuardando(true);
        try {
            const guardada = await onGuardar({
                ...form,
                titulo: form.titulo.trim(),
                descripcion: form.descripcion.trim(),
                cliente_nombre: form.cliente_nombre.trim(),
                ubicacion: form.ubicacion.trim(),
                contacto: form.contacto.trim(),
                equipo_referencia: form.equipo_referencia.trim(),
                observaciones: form.observaciones.trim(),
            });
            if (guardada) {
                inicialRef.current = form;
                intentarCerrar(true);
            }
        } finally {
            setGuardando(false);
        }
    };

    const modoEdicion = Boolean(form.id);

    return (
        <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tarea-form-titulo"
            aria-busy={guardando}
            tabIndex={-1}
            className={`fixed inset-0 z-50 flex items-end justify-center bg-slate-900/65 p-0 sm:items-center sm:p-4 ${transicion.claseFondo}`}
            onClick={(event) => {
                if (event.target === event.currentTarget) intentarCerrar();
            }}
        >
            <div
                className={`max-h-[96dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-3xl dark:bg-carbon-900 ${transicion.clasePanel}`}
                style={{
                    paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
                }}
            >
                <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-carbon-900/95 sm:px-6">
                    <div>
                        <h2
                            id="tarea-form-titulo"
                            className="text-lg font-extrabold text-slate-900 dark:text-slate-100"
                        >
                            {modoEdicion ? "Editar tarea" : "Nueva tarea"}
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                            {modoEdicion
                                ? `Tarea #${String(form.id).padStart(4, "0")}`
                                : "Registra una solicitud de taller o una visita a terreno"}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => intentarCerrar()}
                        data-dialog-autofocus
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10"
                        aria-label="Cerrar formulario"
                    >
                        ✕
                    </button>
                </header>

                <form onSubmit={enviar} className="space-y-5 px-5 py-5 sm:px-6" noValidate>
                    <section>
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                            Trabajo solicitado
                        </h3>
                        <div className="mt-3 space-y-3">
                            <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                                Tarea <span className="text-rose-600">*</span>
                                <input
                                    ref={(el) => {
                                        refs.current.titulo = el;
                                    }}
                                    type="text"
                                    value={form.titulo}
                                    onChange={(event) =>
                                        cambiar("titulo", event.target.value)
                                    }
                                    placeholder="Ej. Mantención preventiva grúa horquilla"
                                    className={`${INPUT_CLASES} ${
                                        errores.titulo ? "border-rose-500" : ""
                                    }`}
                                />
                                {errores.titulo && (
                                    <span className="mt-1 block text-xs text-rose-600">
                                        {errores.titulo}
                                    </span>
                                )}
                            </label>
                            <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                                Descripción
                                <textarea
                                    value={form.descripcion}
                                    onChange={(event) =>
                                        cambiar("descripcion", event.target.value)
                                    }
                                    rows={3}
                                    placeholder="Detalle del problema, repuestos necesarios o instrucciones…"
                                    className={INPUT_CLASES}
                                />
                            </label>
                            <div className="grid md:grid-cols-2 gap-3">
                                <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                                    Tipo
                                    <select
                                        value={form.tipo}
                                        onChange={(event) =>
                                            cambiar("tipo", event.target.value)
                                        }
                                        className={INPUT_CLASES}
                                    >
                                        {TIPOS_TAREA.map((tipo) => (
                                            <option key={tipo} value={tipo}>
                                                {tipo === "Taller"
                                                    ? "🔧 Taller"
                                                    : "🚐 Terreno"}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                                    Prioridad
                                    <select
                                        value={form.prioridad}
                                        onChange={(event) =>
                                            cambiar("prioridad", event.target.value)
                                        }
                                        className={INPUT_CLASES}
                                    >
                                        {PRIORIDADES_TAREA.map((prioridad) => (
                                            <option key={prioridad} value={prioridad}>
                                                {prioridad}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        </div>
                    </section>

                    <section className="border-t border-slate-200 pt-5 dark:border-white/10">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                            Fecha y estado
                        </h3>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                                Fecha programada
                                <input
                                    type="date"
                                    value={form.fecha_programada}
                                    onChange={(event) =>
                                        cambiar(
                                            "fecha_programada",
                                            event.target.value,
                                        )
                                    }
                                    className={INPUT_CLASES}
                                />
                            </label>
                            <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                                Estado
                                <select
                                    value={form.estado}
                                    onChange={(event) =>
                                        cambiar("estado", event.target.value)
                                    }
                                    className={INPUT_CLASES}
                                >
                                    {ESTADOS_TAREA.map((estado) => (
                                        <option key={estado} value={estado}>
                                            {estado}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                                Hora de inicio
                                <input
                                    type="time"
                                    value={form.hora_inicio}
                                    onChange={(event) =>
                                        cambiar("hora_inicio", event.target.value)
                                    }
                                    className={INPUT_CLASES}
                                />
                            </label>
                            <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                                Hora de término
                                <input
                                    ref={(el) => {
                                        refs.current.hora_fin = el;
                                    }}
                                    type="time"
                                    value={form.hora_fin}
                                    onChange={(event) =>
                                        cambiar("hora_fin", event.target.value)
                                    }
                                    className={`${INPUT_CLASES} ${
                                        errores.hora_fin ? "border-rose-500" : ""
                                    }`}
                                />
                                {errores.hora_fin && (
                                    <span className="mt-1 block text-xs text-rose-600">
                                        {errores.hora_fin}
                                    </span>
                                )}
                            </label>
                        </div>
                    </section>

                    <section className="border-t border-slate-200 pt-5 dark:border-white/10">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                                Técnicos asignados
                            </h3>
                            <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                                {form.tecnicos.length} seleccionado
                                {form.tecnicos.length === 1 ? "" : "s"}
                            </span>
                        </div>
                        {tecnicosLocales.length > 0 ? (
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {tecnicosLocales.map((nombre) => {
                                    const seleccionado =
                                        form.tecnicos.includes(nombre);
                                    return (
                                        <label
                                            key={nombre}
                                            className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                                seleccionado
                                                    ? "border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-400/50 dark:bg-blue-500/10 dark:text-blue-200"
                                                    : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={seleccionado}
                                                onChange={() =>
                                                    alternarTecnico(nombre)
                                                }
                                                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="truncate">{nombre}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                                Todavía no hay técnicos en el catálogo. Agrégalo aquí abajo.
                            </p>
                        )}
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <input
                                type="text"
                                value={nuevoTecnico}
                                onChange={(event) =>
                                    setNuevoTecnico(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        agregarTecnico();
                                    }
                                }}
                                placeholder="Nombre de un técnico nuevo"
                                className={`${INPUT_CLASES} mt-0 flex-1`}
                            />
                            <button
                                type="button"
                                onClick={agregarTecnico}
                                disabled={!nuevoTecnico.trim() || creandoTecnico}
                                className="min-h-[44px] rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                            >
                                {creandoTecnico ? "Agregando…" : "+ Agregar técnico"}
                            </button>
                        </div>

                        {conflictos.length > 0 && (
                            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                                <p className="text-sm font-extrabold text-amber-900 dark:text-amber-200">
                                    ⚠ Ya hay trabajos para esos técnicos el {formatearFechaTarea(form.fecha_programada)}
                                </p>
                                <ul className="mt-1.5 space-y-1 text-xs text-amber-800 dark:text-amber-300">
                                    {conflictos.map((conflicto) => (
                                        <li key={conflicto.id}>
                                            • {conflicto.titulo} — {conflicto.tecnicos.filter((nombre) => form.tecnicos.includes(nombre)).join(", ")}
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                                    Es solo un aviso: puedes guardar si los horarios no chocan o si trabajarán juntos.
                                </p>
                            </div>
                        )}
                    </section>

                    <section className="border-t border-slate-200 pt-5 dark:border-white/10">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                            Cliente y ubicación
                        </h3>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 md:col-span-2">
                                Cliente
                                <input
                                    type="text"
                                    list="clientes-tareas"
                                    value={form.cliente_nombre}
                                    onChange={(event) =>
                                        cambiarCliente(event.target.value)
                                    }
                                    placeholder="Escribe parte del nombre o ingresa uno nuevo"
                                    className={INPUT_CLASES}
                                    autoComplete="off"
                                />
                                <datalist id="clientes-tareas">
                                    {clientes.map((cliente) => (
                                        <option
                                            key={cliente.id}
                                            value={cliente.razon_social}
                                        />
                                    ))}
                                </datalist>
                            </label>
                            <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                                Ubicación
                                <input
                                    type="text"
                                    value={form.ubicacion}
                                    onChange={(event) =>
                                        cambiar("ubicacion", event.target.value)
                                    }
                                    placeholder="Dirección o sector del taller"
                                    className={INPUT_CLASES}
                                />
                            </label>
                            <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                                Contacto
                                <input
                                    type="text"
                                    value={form.contacto}
                                    onChange={(event) =>
                                        cambiar("contacto", event.target.value)
                                    }
                                    placeholder="Nombre y teléfono"
                                    className={INPUT_CLASES}
                                />
                            </label>
                            <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 md:col-span-2">
                                Equipo o referencia
                                <input
                                    type="text"
                                    value={form.equipo_referencia}
                                    onChange={(event) =>
                                        cambiar(
                                            "equipo_referencia",
                                            event.target.value,
                                        )
                                    }
                                    placeholder="N° interno, modelo, patente u otra referencia"
                                    className={INPUT_CLASES}
                                />
                            </label>
                            <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 md:col-span-2">
                                Observaciones internas
                                <textarea
                                    value={form.observaciones}
                                    onChange={(event) =>
                                        cambiar("observaciones", event.target.value)
                                    }
                                    rows={2}
                                    placeholder="Acuerdos, repuestos pendientes u otra información…"
                                    className={INPUT_CLASES}
                                />
                            </label>
                        </div>
                    </section>

                    <footer
                        className="sticky bottom-0 -mx-5 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white/95 px-5 pt-4 backdrop-blur sm:-mx-6 sm:flex-row sm:justify-end sm:px-6 dark:border-white/10 dark:bg-carbon-900/95"
                        style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
                    >
                        <button
                            type="button"
                            onClick={() => intentarCerrar()}
                            disabled={guardando}
                            className="min-h-[44px] rounded-xl bg-slate-100 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={guardando}
                            className="min-h-[44px] rounded-xl bg-blue-600 px-6 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                        >
                            {guardando
                                ? "Guardando…"
                                : modoEdicion
                                  ? "Guardar cambios"
                                  : "Crear tarea"}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
}
