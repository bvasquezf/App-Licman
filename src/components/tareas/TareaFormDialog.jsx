import { useEffect, useMemo, useRef, useState } from "react";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { useModalTransition } from "../../hooks/useModalTransition";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import {
    ESTADOS_TAREA,
    PRIORIDADES_TAREA,
    TIPOS_TAREA,
    estadoSegunPlanificacion,
    formatearFechaTarea,
    tareasSeSolapan,
} from "../../lib/tareasData";
import TareaHistorial from "./TareaHistorial";

const INPUT_CLASES =
    "mt-1 block min-h-[44px] w-full rounded-xl border-[1.5px] border-slate-300 bg-white px-3 py-2.5 text-base font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100 dark:placeholder-neutral-500";

function valoresIniciales(tarea) {
    return {
        id: tarea?.id ?? null,
        titulo: tarea?.titulo ?? "",
        descripcion: tarea?.descripcion ?? "",
        tipo: tarea?.tipo ?? "Taller",
        estado: tarea?.estado ?? "Por programar",
        prioridad: tarea?.prioridad ?? "Normal",
        fecha_programada: tarea?.fecha_programada ?? "",
        hora_inicio: tarea?.hora_inicio
            ? String(tarea.hora_inicio).slice(0, 5)
            : "",
        hora_fin: tarea?.hora_fin
            ? String(tarea.hora_fin).slice(0, 5)
            : "",
        cliente_id: tarea?.cliente_id ?? null,
        cliente_nombre: tarea?.cliente_nombre ?? "",
        ubicacion: tarea?.ubicacion ?? "",
        contacto: tarea?.contacto ?? "",
        equipo_id: tarea?.equipo_id ?? null,
        equipo_referencia: tarea?.equipo_referencia ?? "",
        observaciones: tarea?.observaciones ?? "",
        motivo_espera: tarea?.motivo_espera ?? "",
        resultado: tarea?.resultado ?? "",
        tecnicos: tarea?.tecnicos ?? [],
    };
}

function etiquetaEquipo(equipo) {
    return [
        equipo.numero_serie ? `Serie ${equipo.numero_serie}` : null,
        [equipo.marca, equipo.modelo].filter(Boolean).join(" "),
    ]
        .filter(Boolean)
        .join(" · ");
}

export default function TareaFormDialog({
    open,
    tarea,
    tareas,
    tecnicos,
    clientes,
    equipos,
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
    const [planificacionAbierta, setPlanificacionAbierta] = useState(false);

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
            setPlanificacionAbierta(
                Boolean(
                    inicial.id ||
                        inicial.fecha_programada ||
                        inicial.tecnicos.length,
                ),
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
                    ["Programada", "En proceso", "En espera"].includes(
                        otra.estado,
                    ) &&
                    otra.tecnicos?.some((nombre) =>
                        form.tecnicos.includes(nombre),
                    ) &&
                    tareasSeSolapan(form, otra),
            )
            .slice(0, 5);
    }, [form, tareas]);

    const equiposDisponibles = useMemo(() => {
        const delCliente = form.cliente_id
            ? equipos.filter(
                  (equipo) => equipo.cliente_id === Number(form.cliente_id),
              )
            : equipos;
        const actual = equipos.find(
            (equipo) => equipo.id === Number(form.equipo_id),
        );
        if (actual && !delCliente.some((equipo) => equipo.id === actual.id)) {
            return [actual, ...delCliente];
        }
        return delCliente;
    }, [equipos, form.cliente_id, form.equipo_id]);

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
        setForm((prev) => {
            const equipoActual = equipos.find(
                (equipo) => equipo.id === Number(prev.equipo_id),
            );
            const equipoCompatible =
                !encontrado ||
                !equipoActual ||
                equipoActual.cliente_id === encontrado.id;
            return {
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
                equipo_id: equipoCompatible ? prev.equipo_id : null,
                equipo_referencia: equipoCompatible
                    ? prev.equipo_referencia
                    : "",
            };
        });
    };

    const cambiarEquipo = (valor) => {
        const equipoId = valor ? Number(valor) : null;
        const encontrado = equipos.find((equipo) => equipo.id === equipoId);
        setForm((prev) => ({
            ...prev,
            equipo_id: equipoId,
            equipo_referencia: encontrado
                ? etiquetaEquipo(encontrado)
                : prev.equipo_id
                  ? ""
                  : prev.equipo_referencia,
            ubicacion:
                encontrado?.ubicacion_actual && !prev.ubicacion
                    ? encontrado.ubicacion_actual
                    : prev.ubicacion,
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
                prev.includes(creado)
                    ? prev
                    : [...prev, creado].sort((a, b) =>
                          a.localeCompare(b, "es"),
                      ),
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
        let estado = form.estado;
        if (
            !form.id ||
            ["Por programar", "Programada"].includes(form.estado)
        ) {
            estado = estadoSegunPlanificacion(form);
        }

        if (!form.titulo.trim()) {
            nextErrores.titulo = "Escribe qué trabajo hay que realizar";
        }
        if (
            (form.hora_inicio || form.hora_fin) &&
            !form.fecha_programada
        ) {
            nextErrores.fecha_programada =
                "Selecciona una fecha para guardar el horario";
        }
        if (
            form.hora_inicio &&
            form.hora_fin &&
            form.hora_fin <= form.hora_inicio
        ) {
            nextErrores.hora_fin = "La hora de término debe ser posterior";
        }
        if (
            ["Programada", "En proceso"].includes(estado) &&
            !form.fecha_programada
        ) {
            nextErrores.fecha_programada = "Este estado necesita una fecha";
        }
        if (
            ["Programada", "En proceso"].includes(estado) &&
            form.tecnicos.length === 0
        ) {
            nextErrores.tecnicos = "Asigna al menos un técnico";
        }
        if (estado === "En espera" && !form.motivo_espera.trim()) {
            nextErrores.motivo_espera =
                "Indica por qué el trabajo quedó en espera";
        }
        if (estado === "Finalizada" && !form.resultado.trim()) {
            nextErrores.resultado =
                "Registra el resultado antes de finalizar";
        }
        if (Object.keys(nextErrores).length > 0) {
            setErrores(nextErrores);
            setPlanificacionAbierta(true);
            window.setTimeout(() => {
                refs.current[Object.keys(nextErrores)[0]]?.focus();
            }, 0);
            return;
        }

        setGuardando(true);
        try {
            const payload = {
                ...form,
                estado,
                titulo: form.titulo.trim(),
                descripcion: form.descripcion.trim(),
                cliente_nombre: form.cliente_nombre.trim(),
                ubicacion: form.ubicacion.trim(),
                contacto: form.contacto.trim(),
                equipo_referencia: form.equipo_referencia.trim(),
                observaciones: form.observaciones.trim(),
                motivo_espera: form.motivo_espera.trim(),
                resultado: form.resultado.trim(),
            };
            const guardada = await onGuardar(payload);
            if (guardada) {
                inicialRef.current = payload;
                intentarCerrar(true);
            }
        } finally {
            setGuardando(false);
        }
    };

    const modoEdicion = Boolean(form.id);
    const estadoCalculado =
        !modoEdicion ||
        ["Por programar", "Programada"].includes(form.estado)
            ? estadoSegunPlanificacion(form)
            : form.estado;

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
                className={`flex max-h-[calc(100dvh-0.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-3xl dark:border-white/10 dark:bg-carbon-900 ${transicion.clasePanel}`}
            >
                <header
                    className="relative flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 pb-4 pt-5 sm:px-6 dark:border-white/10 dark:bg-carbon-900"
                    style={{
                        paddingTop: "max(1.25rem, env(safe-area-inset-top))",
                    }}
                >
                    <span
                        className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-slate-300 sm:hidden dark:bg-white/20"
                        aria-hidden="true"
                    />
                    <div className="min-w-0">
                        <h2
                            id="tarea-form-titulo"
                            className="text-lg font-black text-slate-950 dark:text-white"
                        >
                            {modoEdicion ? "Editar tarea" : "Nueva solicitud"}
                        </h2>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
                            {modoEdicion
                                ? `Tarea #${String(form.id).padStart(4, "0")} · ${form.estado}`
                                : planificacionAbierta
                                  ? "Registra y programa el trabajo en un solo paso"
                                  : "Anota lo esencial ahora y prográmala después"}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => intentarCerrar()}
                        data-dialog-autofocus
                        disabled={guardando}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-white/10"
                        aria-label="Cerrar formulario"
                    >
                        ×
                    </button>
                </header>

                <form
                    onSubmit={enviar}
                    className="flex min-h-0 flex-1 flex-col"
                    noValidate
                >
                    <div className="dialog-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
                        <section>
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                                Solicitud
                            </h3>
                            <div className="mt-3 space-y-3">
                                <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                                    Trabajo solicitado{" "}
                                    <span className="text-rose-600">*</span>
                                    <input
                                        ref={(el) => {
                                            refs.current.titulo = el;
                                        }}
                                        type="text"
                                        value={form.titulo}
                                        onChange={(event) =>
                                            cambiar("titulo", event.target.value)
                                        }
                                        placeholder="Ej. Revisar fuga hidráulica del equipo"
                                        className={`${INPUT_CLASES} ${
                                            errores.titulo
                                                ? "border-rose-500"
                                                : ""
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
                                            cambiar(
                                                "descripcion",
                                                event.target.value,
                                            )
                                        }
                                        rows={3}
                                        placeholder="Problema informado, instrucciones o antecedentes importantes…"
                                        className={INPUT_CLASES}
                                    />
                                </label>
                                <div className="grid gap-3 md:grid-cols-2">
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
                                                cambiar(
                                                    "prioridad",
                                                    event.target.value,
                                                )
                                            }
                                            className={INPUT_CLASES}
                                        >
                                            {PRIORIDADES_TAREA.map((prioridad) => (
                                                <option
                                                    key={prioridad}
                                                    value={prioridad}
                                                >
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
                                Cliente que solicita
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
                                <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 md:col-span-2">
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
                            </div>
                        </section>

                        {!planificacionAbierta && !modoEdicion ? (
                            <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-500/25 dark:bg-blue-500/5">
                                <h3 className="text-base font-black text-blue-950 dark:text-blue-200">
                                    ¿Ya sabes cuándo y quién la realizará?
                                </h3>
                                <p className="mt-1 text-sm leading-relaxed text-blue-800 dark:text-blue-300">
                                    Puedes guardarla ahora en Por programar o completar
                                    fecha, horario, técnico, ubicación y equipo.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setPlanificacionAbierta(true)}
                                    className="mt-3 min-h-[44px] rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white hover:bg-blue-700"
                                >
                                    📅 Programar ahora
                                </button>
                            </section>
                        ) : (
                            <>
                                <section className="border-t border-slate-200 pt-5 dark:border-white/10">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                                            Planificación
                                        </h3>
                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                                            {estadoCalculado}
                                        </span>
                                    </div>
                                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                                        <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                                            Fecha
                                            <input
                                                ref={(el) => {
                                                    refs.current.fecha_programada =
                                                        el;
                                                }}
                                                type="date"
                                                value={form.fecha_programada}
                                                onChange={(event) =>
                                                    cambiar(
                                                        "fecha_programada",
                                                        event.target.value,
                                                    )
                                                }
                                                className={`${INPUT_CLASES} ${
                                                    errores.fecha_programada
                                                        ? "border-rose-500"
                                                        : ""
                                                }`}
                                            />
                                            {errores.fecha_programada && (
                                                <span className="mt-1 block text-xs text-rose-600">
                                                    {errores.fecha_programada}
                                                </span>
                                            )}
                                        </label>
                                        <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                                            Inicio
                                            <input
                                                type="time"
                                                value={form.hora_inicio}
                                                onChange={(event) =>
                                                    cambiar(
                                                        "hora_inicio",
                                                        event.target.value,
                                                    )
                                                }
                                                className={INPUT_CLASES}
                                            />
                                        </label>
                                        <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                                            Término
                                            <input
                                                ref={(el) => {
                                                    refs.current.hora_fin = el;
                                                }}
                                                type="time"
                                                value={form.hora_fin}
                                                onChange={(event) =>
                                                    cambiar(
                                                        "hora_fin",
                                                        event.target.value,
                                                    )
                                                }
                                                className={`${INPUT_CLASES} ${
                                                    errores.hora_fin
                                                        ? "border-rose-500"
                                                        : ""
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
                                                                alternarTecnico(
                                                                    nombre,
                                                                )
                                                            }
                                                            className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className="truncate">
                                                            {nombre}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                                            Todavía no hay técnicos en el catálogo.
                                        </p>
                                    )}
                                    {errores.tecnicos && (
                                        <p className="mt-2 text-xs font-semibold text-rose-600">
                                            {errores.tecnicos}
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
                                            disabled={
                                                !nuevoTecnico.trim() ||
                                                creandoTecnico
                                            }
                                            className="min-h-[44px] rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                                        >
                                            {creandoTecnico
                                                ? "Agregando…"
                                                : "+ Agregar técnico"}
                                        </button>
                                    </div>

                                    {conflictos.length > 0 && (
                                        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                                            <p className="text-sm font-extrabold text-amber-900 dark:text-amber-200">
                                                ⚠ Posible cruce de horario el{" "}
                                                {formatearFechaTarea(
                                                    form.fecha_programada,
                                                )}
                                            </p>
                                            <ul className="mt-1.5 space-y-1 text-xs text-amber-800 dark:text-amber-300">
                                                {conflictos.map((conflicto) => (
                                                    <li key={conflicto.id}>
                                                        • {conflicto.titulo} —{" "}
                                                        {conflicto.tecnicos
                                                            .filter((nombre) =>
                                                                form.tecnicos.includes(
                                                                    nombre,
                                                                ),
                                                            )
                                                            .join(", ")}
                                                    </li>
                                                ))}
                                            </ul>
                                            <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                                                Es un aviso; puedes guardar si los
                                                técnicos trabajarán juntos.
                                            </p>
                                        </div>
                                    )}
                                </section>

                                <section className="border-t border-slate-200 pt-5 dark:border-white/10">
                                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                                        Ubicación y equipo
                                    </h3>
                                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                                        <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 md:col-span-2">
                                            Ubicación
                                            <input
                                                type="text"
                                                value={form.ubicacion}
                                                onChange={(event) =>
                                                    cambiar(
                                                        "ubicacion",
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Dirección, sector o taller"
                                                className={INPUT_CLASES}
                                            />
                                        </label>
                                        <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 md:col-span-2">
                                            Equipo vinculado
                                            <select
                                                value={form.equipo_id ?? ""}
                                                onChange={(event) =>
                                                    cambiarEquipo(event.target.value)
                                                }
                                                className={INPUT_CLASES}
                                            >
                                                <option value="">
                                                    Sin equipo vinculado
                                                </option>
                                                {equiposDisponibles.map((equipo) => (
                                                    <option
                                                        key={equipo.id}
                                                        value={equipo.id}
                                                    >
                                                        {etiquetaEquipo(equipo)}
                                                    </option>
                                                ))}
                                            </select>
                                            {form.cliente_id &&
                                                equiposDisponibles.length === 0 && (
                                                    <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-neutral-400">
                                                        El cliente no tiene equipos
                                                        asociados en inventario.
                                                    </span>
                                                )}
                                        </label>
                                        <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 md:col-span-2">
                                            Referencia libre
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
                                                    cambiar(
                                                        "observaciones",
                                                        event.target.value,
                                                    )
                                                }
                                                rows={2}
                                                placeholder="Acuerdos, repuestos pendientes u otra información…"
                                                className={INPUT_CLASES}
                                            />
                                        </label>
                                    </div>
                                </section>

                                {modoEdicion && (
                                    <section className="border-t border-slate-200 pt-5 dark:border-white/10">
                                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                                            Estado operativo
                                        </h3>
                                        <div className="mt-3 space-y-3">
                                            <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                                                Estado
                                                <select
                                                    value={form.estado}
                                                    onChange={(event) =>
                                                        cambiar(
                                                            "estado",
                                                            event.target.value,
                                                        )
                                                    }
                                                    className={INPUT_CLASES}
                                                >
                                                    {ESTADOS_TAREA.map((estado) => (
                                                        <option
                                                            key={estado}
                                                            value={estado}
                                                        >
                                                            {estado}
                                                        </option>
                                                    ))}
                                                </select>
                                                {["Por programar", "Programada"].includes(
                                                    form.estado,
                                                ) && (
                                                    <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-neutral-400">
                                                        Se ajustará automáticamente
                                                        según tenga fecha y técnico.
                                                    </span>
                                                )}
                                            </label>
                                            {form.estado === "En espera" && (
                                                <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                                                    Motivo de espera{" "}
                                                    <span className="text-rose-600">
                                                        *
                                                    </span>
                                                    <textarea
                                                        ref={(el) => {
                                                            refs.current.motivo_espera =
                                                                el;
                                                        }}
                                                        value={form.motivo_espera}
                                                        onChange={(event) =>
                                                            cambiar(
                                                                "motivo_espera",
                                                                event.target.value,
                                                            )
                                                        }
                                                        rows={3}
                                                        className={`${INPUT_CLASES} ${
                                                            errores.motivo_espera
                                                                ? "border-rose-500"
                                                                : ""
                                                        }`}
                                                    />
                                                    {errores.motivo_espera && (
                                                        <span className="mt-1 block text-xs text-rose-600">
                                                            {
                                                                errores.motivo_espera
                                                            }
                                                        </span>
                                                    )}
                                                </label>
                                            )}
                                            {form.estado === "Finalizada" && (
                                                <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                                                    Resultado{" "}
                                                    <span className="text-rose-600">
                                                        *
                                                    </span>
                                                    <textarea
                                                        ref={(el) => {
                                                            refs.current.resultado = el;
                                                        }}
                                                        value={form.resultado}
                                                        onChange={(event) =>
                                                            cambiar(
                                                                "resultado",
                                                                event.target.value,
                                                            )
                                                        }
                                                        rows={3}
                                                        className={`${INPUT_CLASES} ${
                                                            errores.resultado
                                                                ? "border-rose-500"
                                                                : ""
                                                        }`}
                                                    />
                                                    {errores.resultado && (
                                                        <span className="mt-1 block text-xs text-rose-600">
                                                            {errores.resultado}
                                                        </span>
                                                    )}
                                                </label>
                                            )}
                                        </div>
                                    </section>
                                )}
                            </>
                        )}

                        {modoEdicion && <TareaHistorial tareaId={form.id} />}
                    </div>

                    <footer
                        className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-200 bg-white px-5 pt-3 shadow-[0_-10px_30px_rgba(15,23,42,0.06)] sm:px-6 dark:border-white/10 dark:bg-carbon-900"
                        style={{
                            paddingBottom:
                                "max(0.75rem, env(safe-area-inset-bottom))",
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => intentarCerrar()}
                            disabled={guardando}
                            className="min-h-[48px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={guardando}
                            className="min-h-[48px] rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white shadow-[0_4px_12px_rgba(37,99,235,0.24)] hover:bg-blue-700 disabled:opacity-60"
                        >
                            {guardando
                                ? "Guardando…"
                                : modoEdicion
                                  ? "Guardar cambios"
                                  : estadoCalculado === "Programada"
                                    ? "Crear programada"
                                    : "Guardar por programar"}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
}
