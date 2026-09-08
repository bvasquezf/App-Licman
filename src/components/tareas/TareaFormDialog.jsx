import { useEffect, useMemo, useRef, useState } from "react";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { useModalTransition } from "../../hooks/useModalTransition";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import {
    CATEGORIAS_REQUERIMIENTO,
    ESTADOS_TAREA,
    ORIGENES_REQUERIMIENTO,
    PRIORIDADES_TAREA,
    TIPOS_TAREA,
    datosCategoriaRequerimiento,
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
        categoria_requerimiento: tarea?.categoria_requerimiento ?? "Otro",
        origen_requerimiento: tarea?.origen_requerimiento ?? "Otro",
        referencia_origen: tarea?.referencia_origen ?? "",
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
        tecnico_ids: tarea?.tecnico_ids ?? [],
    };
}

function etiquetaEquipo(equipo) {
    return [
        equipo.numero_serie ? `Serie ${equipo.numero_serie}` : null,
        [equipo.marca, equipo.modelo].filter(Boolean).join(" "),
        equipo.estado_operacional || null,
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
    onEliminar,
    puedeEliminar = true,
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
    const [tecnicosLocales, setTecnicosLocales] = useState([]);
    const [planificacionAbierta, setPlanificacionAbierta] = useState(false);

    useEffect(() => {
        if (open && !abiertoAnteriorRef.current) {
            const inicial = valoresIniciales(tarea);
            inicialRef.current = inicial;
            setForm(inicial);
            setErrores({});
            setGuardando(false);
            const porId = new Map(
                tecnicos
                    .filter((tecnico) => tecnico.activo)
                    .map((tecnico) => [tecnico.id, tecnico]),
            );
            for (const asignacion of tarea?.asignaciones_tecnicos ?? []) {
                if (asignacion.id && !porId.has(asignacion.id)) {
                    porId.set(asignacion.id, {
                        ...asignacion,
                        activo: false,
                    });
                }
            }
            setTecnicosLocales(
                [...porId.values()].sort((a, b) =>
                    a.nombre.localeCompare(b.nombre, "es"),
                ),
            );
            setPlanificacionAbierta(
                Boolean(
                    inicial.id ||
                        inicial.fecha_programada ||
                        inicial.tecnico_ids.length,
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
        if (!form.fecha_programada || form.tecnico_ids.length === 0) return [];
        return tareas
            .filter(
                (otra) =>
                    otra.id !== form.id &&
                    ["Programada", "En proceso", "En espera"].includes(
                        otra.estado,
                    ) &&
                    otra.tecnico_ids?.some((tecnicoId) =>
                        form.tecnico_ids.includes(tecnicoId),
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

    const limpiarErrores = (...campos) => {
        setErrores((prev) => {
            const next = { ...prev };
            let cambio = false;
            for (const campo of campos) {
                if (next[campo]) {
                    delete next[campo];
                    cambio = true;
                }
            }
            return cambio ? next : prev;
        });
    };

    const buscarCliente = (valor) =>
        clientes.find(
            (cliente) =>
                cliente.razon_social.toLocaleLowerCase("es") ===
                valor.trim().toLocaleLowerCase("es"),
        );

    const confirmarCliente = (valor) => {
        const encontrado = buscarCliente(valor);
        const equipoActual = equipos.find(
            (equipo) => equipo.id === Number(form.equipo_id),
        );
        const cambiaCliente =
            (form.cliente_id ?? null) !== (encontrado?.id ?? null) &&
            Boolean(form.cliente_id || encontrado);
        const direccionCliente = encontrado
            ? [encontrado.direccion, encontrado.comuna]
                  .filter(Boolean)
                  .join(", ")
            : "";
        const contactoCliente = encontrado
            ? [encontrado.contacto, encontrado.celular]
                  .filter(Boolean)
                  .join(" · ")
            : "";
        const equipoCompatible =
            !cambiaCliente ||
            !equipoActual ||
            Boolean(
                encontrado && equipoActual.cliente_id === encontrado.id,
            );
        setForm((prev) => {
            return {
                ...prev,
                cliente_nombre: valor,
                cliente_id: encontrado?.id ?? null,
                ubicacion: cambiaCliente ? direccionCliente : prev.ubicacion,
                contacto: cambiaCliente ? contactoCliente : prev.contacto,
                equipo_id: equipoCompatible ? prev.equipo_id : null,
                equipo_referencia: equipoCompatible
                    ? prev.equipo_referencia
                    : "",
            };
        });
        limpiarErrores("cliente_nombre");
        if (direccionCliente) limpiarErrores("ubicacion");
        if (contactoCliente) limpiarErrores("contacto");
        if (!equipoCompatible) limpiarErrores("equipo_id");
    };

    const cambiarCliente = (valor) => {
        if (!valor.trim() || buscarCliente(valor)) {
            confirmarCliente(valor);
            return;
        }
        setForm((prev) => ({ ...prev, cliente_nombre: valor }));
        limpiarErrores("cliente_nombre");
    };

    const cambiarEquipo = (valor) => {
        const equipoId = valor ? Number(valor) : null;
        const encontrado = equipos.find((equipo) => equipo.id === equipoId);
        const clienteEquipo = encontrado?.cliente_id
            ? clientes.find(
                  (cliente) => cliente.id === encontrado.cliente_id,
              )
            : null;

        if (
            encontrado?.cliente_id &&
            form.cliente_id &&
            encontrado.cliente_id !== Number(form.cliente_id)
        ) {
            setErrores((prev) => ({
                ...prev,
                equipo_id:
                    "Este equipo pertenece a otro cliente. Selecciona uno compatible.",
            }));
            refs.current.equipo_id?.focus();
            return;
        }

        setForm((prev) => ({
            ...prev,
            equipo_id: equipoId,
            equipo_referencia: encontrado
                ? etiquetaEquipo(encontrado)
                : prev.equipo_id
                  ? ""
                  : prev.equipo_referencia,
            cliente_id:
                !prev.cliente_id && clienteEquipo
                    ? clienteEquipo.id
                    : prev.cliente_id,
            cliente_nombre:
                !prev.cliente_id && clienteEquipo
                    ? clienteEquipo.razon_social
                    : prev.cliente_nombre,
            ubicacion:
                !prev.cliente_id && clienteEquipo
                    ? [clienteEquipo.direccion, clienteEquipo.comuna]
                          .filter(Boolean)
                          .join(", ") || encontrado?.ubicacion_actual
                    : encontrado?.ubicacion_actual && !prev.ubicacion
                      ? encontrado.ubicacion_actual
                      : prev.ubicacion,
            contacto:
                !prev.cliente_id && clienteEquipo
                    ? [clienteEquipo.contacto, clienteEquipo.celular]
                          .filter(Boolean)
                          .join(" · ")
                    : prev.contacto,
        }));
        limpiarErrores(
            "cliente_nombre",
            "ubicacion",
            "contacto",
            "equipo_id",
        );
    };

    const cambiarCategoria = (categoria) => {
        const { tipoSugerido } = datosCategoriaRequerimiento(categoria);
        setForm((prev) => ({
            ...prev,
            categoria_requerimiento: categoria,
            tipo: tipoSugerido,
        }));
    };

    const alternarTecnico = (tecnicoId) => {
        setForm((prev) => ({
            ...prev,
            tecnico_ids: prev.tecnico_ids.includes(tecnicoId)
                ? prev.tecnico_ids.filter((actual) => actual !== tecnicoId)
                : [...prev.tecnico_ids, tecnicoId],
        }));
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
            form.tecnico_ids.length === 0
        ) {
            nextErrores.tecnicos = "Asigna al menos un técnico";
        }
        if (
            form.tecnico_ids.some(
                (tecnicoId) =>
                    !tecnicos.some(
                        (tecnico) =>
                            tecnico.id === tecnicoId && tecnico.activo,
                    ),
            )
        ) {
            nextErrores.tecnicos =
                "Quita o reemplaza los técnicos que ya no están disponibles";
        }
        if (estado === "En espera" && !form.motivo_espera.trim()) {
            nextErrores.motivo_espera =
                "Indica por qué el trabajo quedó en espera";
        }
        if (estado === "Finalizada" && !form.resultado.trim()) {
            nextErrores.resultado =
                "Registra el resultado antes de finalizar";
        }
        const terrenoEnOperacion =
            form.tipo === "Terreno" &&
            ["Programada", "En proceso", "En espera"].includes(estado);
        if (terrenoEnOperacion && !form.cliente_nombre.trim()) {
            nextErrores.cliente_nombre =
                "Indica a qué cliente corresponde la visita";
        }
        if (terrenoEnOperacion && !form.contacto.trim()) {
            nextErrores.contacto =
                "Agrega un contacto para coordinar la visita";
        }
        if (terrenoEnOperacion && !form.ubicacion.trim()) {
            nextErrores.ubicacion =
                "Indica la dirección o ubicación de la visita";
        }
        const exigeEquipoVigente = [
            "Programada",
            "En proceso",
            "En espera",
        ].includes(estado);
        if (form.equipo_id && exigeEquipoVigente) {
            const equipoSeleccionado = equipos.find(
                (equipo) => equipo.id === Number(form.equipo_id),
            );
            if (!equipoSeleccionado) {
                nextErrores.equipo_id =
                    "El equipo ya no está disponible en el inventario";
            } else if (
                equipoSeleccionado.cliente_id &&
                equipoSeleccionado.cliente_id !== Number(form.cliente_id)
            ) {
                nextErrores.equipo_id =
                    "El equipo vinculado pertenece a otro cliente";
            }
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
                referencia_origen: form.referencia_origen.trim(),
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

    const eliminarActual = async () => {
        if (!form.id || guardando) return;
        setGuardando(true);
        try {
            const eliminada = await onEliminar(form);
            if (eliminada) intentarCerrar(true);
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
    const requiereDatosTerreno =
        form.tipo === "Terreno" &&
        ["Programada", "En proceso", "En espera"].includes(estadoCalculado);

    return (
        <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tarea-form-titulo"
            aria-busy={guardando}
            tabIndex={-1}
            className={`app-modal-backdrop z-50 ${transicion.claseFondo}`}
            onClick={(event) => {
                if (event.target === event.currentTarget) intentarCerrar();
            }}
        >
            <div
                className={`app-modal-panel max-w-3xl ${transicion.clasePanel}`}
            >
                <header
                    className="app-modal-header relative"
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
                            {modoEdicion
                                ? "Editar requerimiento"
                                : "Nuevo requerimiento"}
                        </h2>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
                            {modoEdicion
                                ? `Requerimiento #${String(form.id).padStart(4, "0")} · ${form.estado}`
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
                        className="app-modal-close"
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
                    <div className="app-modal-body dialog-scrollbar space-y-5">
                        <section>
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                                Requerimiento
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
                                        aria-invalid={Boolean(errores.titulo)}
                                        aria-describedby={
                                            errores.titulo
                                                ? "tarea-error-titulo"
                                                : undefined
                                        }
                                        className={`${INPUT_CLASES} ${
                                            errores.titulo
                                                ? "border-rose-500"
                                                : ""
                                        }`}
                                    />
                                    {errores.titulo && (
                                        <span
                                            id="tarea-error-titulo"
                                            role="alert"
                                            className="mt-1 block text-xs text-rose-600"
                                        >
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
                                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 md:col-span-2">
                                        Tipo de requerimiento
                                        <select
                                            value={form.categoria_requerimiento}
                                            onChange={(event) =>
                                                cambiarCategoria(event.target.value)
                                            }
                                            className={INPUT_CLASES}
                                        >
                                            {CATEGORIAS_REQUERIMIENTO.map(
                                                (categoria) => (
                                                    <option
                                                        key={categoria.valor}
                                                        value={categoria.valor}
                                                    >
                                                        {categoria.icono}{" "}
                                                        {categoria.etiqueta}
                                                    </option>
                                                ),
                                            )}
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
                                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                                        Modalidad
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
                                                        ? "🔧 En taller"
                                                        : "🚐 En terreno"}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                                        Canal de ingreso
                                        <select
                                            value={form.origen_requerimiento}
                                            onChange={(event) =>
                                                cambiar(
                                                    "origen_requerimiento",
                                                    event.target.value,
                                                )
                                            }
                                            className={INPUT_CLASES}
                                        >
                                            {ORIGENES_REQUERIMIENTO.map((origen) => (
                                                <option key={origen} value={origen}>
                                                    {origen}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                                        Referencia de origen
                                        <input
                                            type="text"
                                            value={form.referencia_origen}
                                            onChange={(event) =>
                                                cambiar(
                                                    "referencia_origen",
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Asunto del correo, OC o folio"
                                            className={INPUT_CLASES}
                                        />
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
                                    {requiereDatosTerreno && (
                                        <span className="text-rose-600"> *</span>
                                    )}
                                    <input
                                        ref={(el) => {
                                            refs.current.cliente_nombre = el;
                                        }}
                                        type="text"
                                        list="clientes-tareas"
                                        value={form.cliente_nombre}
                                        onChange={(event) =>
                                            cambiarCliente(event.target.value)
                                        }
                                        onBlur={(event) =>
                                            confirmarCliente(
                                                event.currentTarget.value,
                                            )
                                        }
                                        placeholder="Escribe parte del nombre o ingresa uno nuevo"
                                        aria-invalid={Boolean(
                                            errores.cliente_nombre,
                                        )}
                                        aria-describedby={
                                            errores.cliente_nombre
                                                ? "tarea-error-cliente"
                                                : undefined
                                        }
                                        className={`${INPUT_CLASES} ${
                                            errores.cliente_nombre
                                                ? "border-rose-500"
                                                : ""
                                        }`}
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
                                    {errores.cliente_nombre && (
                                        <span
                                            id="tarea-error-cliente"
                                            role="alert"
                                            className="mt-1 block text-xs text-rose-600"
                                        >
                                            {errores.cliente_nombre}
                                        </span>
                                    )}
                                </label>
                                <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 md:col-span-2">
                                    Contacto
                                    {requiereDatosTerreno && (
                                        <span className="text-rose-600"> *</span>
                                    )}
                                    <input
                                        ref={(el) => {
                                            refs.current.contacto = el;
                                        }}
                                        type="text"
                                        value={form.contacto}
                                        onChange={(event) =>
                                            cambiar("contacto", event.target.value)
                                        }
                                        placeholder="Nombre y teléfono"
                                        aria-invalid={Boolean(errores.contacto)}
                                        aria-describedby={
                                            errores.contacto
                                                ? "tarea-error-contacto"
                                                : undefined
                                        }
                                        className={`${INPUT_CLASES} ${
                                            errores.contacto
                                                ? "border-rose-500"
                                                : ""
                                        }`}
                                    />
                                    {errores.contacto && (
                                        <span
                                            id="tarea-error-contacto"
                                            role="alert"
                                            className="mt-1 block text-xs text-rose-600"
                                        >
                                            {errores.contacto}
                                        </span>
                                    )}
                                </label>
                            </div>
                        </section>

                        {!planificacionAbierta && !modoEdicion ? (
                            <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-500/25 dark:bg-blue-500/5">
                                <h3 className="text-base font-black text-blue-950 dark:text-blue-200">
                                    ¿Quieres agregar la planificación ahora?
                                </h3>
                                <p className="mt-1 text-sm leading-relaxed text-blue-800 dark:text-blue-300">
                                    Puedes guardar el requerimiento de inmediato,
                                    aunque todavía no exista un técnico. También
                                    puedes agregar fecha, ubicación y equipo ahora.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setPlanificacionAbierta(true)}
                                    className="mt-3 min-h-[44px] rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white hover:bg-blue-700"
                                >
                                    📅 Agregar planificación y detalles
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
                                            {form.tecnico_ids.length} seleccionado
                                            {form.tecnico_ids.length === 1
                                                ? ""
                                                : "s"}
                                        </span>
                                    </div>
                                    {tecnicosLocales.length > 0 ? (
                                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                            {tecnicosLocales.map((tecnico) => {
                                                const seleccionado =
                                                    form.tecnico_ids.includes(
                                                        tecnico.id,
                                                    );
                                                return (
                                                    <label
                                                        key={tecnico.id}
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
                                                                    tecnico.id,
                                                                )
                                                            }
                                                            className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className="min-w-0">
                                                            <span className="block truncate">
                                                                {tecnico.nombre}
                                                            </span>
                                                            <span className="block truncate text-xs font-medium text-slate-500 dark:text-neutral-400">
                                                                {tecnico.activo
                                                                    ? tecnico.cargo ||
                                                                      "Cuenta con rol Técnico"
                                                                    : "Ya no disponible · debes reemplazarlo"}
                                                            </span>
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                                            No hay cuentas activas con rol Técnico.
                                            Puedes guardar igualmente: quedará con
                                            la alerta “Falta asignar técnico”.
                                        </p>
                                    )}
                                    {(tarea?.asignaciones_tecnicos ?? []).some(
                                        (asignacion) => !asignacion.id,
                                    ) && (
                                        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
                                            Esta tarea conserva una asignación
                                            antigua sin cuenta asociada: {" "}
                                            {(tarea.asignaciones_tecnicos ?? [])
                                                .filter(
                                                    (asignacion) =>
                                                        !asignacion.id,
                                                )
                                                .map(
                                                    (asignacion) =>
                                                        asignacion.nombre,
                                                )
                                                .join(", ")}
                                            . Selecciona un usuario registrado
                                            para reemplazarla.
                                        </p>
                                    )}
                                    {errores.tecnicos && (
                                        <p className="mt-2 text-xs font-semibold text-rose-600">
                                            {errores.tecnicos}
                                        </p>
                                    )}

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
                                                        {(conflicto.asignaciones_tecnicos ?? [])
                                                            .filter(
                                                                (asignacion) =>
                                                                    asignacion.id &&
                                                                    form.tecnico_ids.includes(
                                                                        asignacion.id,
                                                                    ),
                                                            )
                                                            .map(
                                                                (asignacion) =>
                                                                    asignacion.nombre,
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
                                            {requiereDatosTerreno && (
                                                <span className="text-rose-600">
                                                    {" "}*
                                                </span>
                                            )}
                                            <input
                                                ref={(el) => {
                                                    refs.current.ubicacion = el;
                                                }}
                                                type="text"
                                                value={form.ubicacion}
                                                onChange={(event) =>
                                                    cambiar(
                                                        "ubicacion",
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Dirección, sector o taller"
                                                aria-invalid={Boolean(
                                                    errores.ubicacion,
                                                )}
                                                aria-describedby={
                                                    errores.ubicacion
                                                        ? "tarea-error-ubicacion"
                                                        : undefined
                                                }
                                                className={`${INPUT_CLASES} ${
                                                    errores.ubicacion
                                                        ? "border-rose-500"
                                                        : ""
                                                }`}
                                            />
                                            {errores.ubicacion && (
                                                <span
                                                    id="tarea-error-ubicacion"
                                                    role="alert"
                                                    className="mt-1 block text-xs text-rose-600"
                                                >
                                                    {errores.ubicacion}
                                                </span>
                                            )}
                                        </label>
                                        <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 md:col-span-2">
                                            Equipo vinculado
                                            <select
                                                ref={(el) => {
                                                    refs.current.equipo_id = el;
                                                }}
                                                value={form.equipo_id ?? ""}
                                                onChange={(event) =>
                                                    cambiarEquipo(event.target.value)
                                                }
                                                aria-invalid={Boolean(
                                                    errores.equipo_id,
                                                )}
                                                aria-describedby={
                                                    errores.equipo_id
                                                        ? "tarea-error-equipo"
                                                        : undefined
                                                }
                                                className={`${INPUT_CLASES} ${
                                                    errores.equipo_id
                                                        ? "border-rose-500"
                                                        : ""
                                                }`}
                                            >
                                                <option value="">
                                                    Sin equipo vinculado
                                                </option>
                                                {equiposDisponibles.map((equipo) => (
                                                    <option
                                                        key={equipo.id}
                                                        value={equipo.id}
                                                        disabled={Boolean(
                                                            form.cliente_id &&
                                                                equipo.cliente_id &&
                                                                equipo.cliente_id !==
                                                                    Number(
                                                                        form.cliente_id,
                                                                    ),
                                                        )}
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
                                            {errores.equipo_id && (
                                                <span
                                                    id="tarea-error-equipo"
                                                    role="alert"
                                                    className="mt-1 block text-xs text-rose-600"
                                                >
                                                    {errores.equipo_id}
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

                        {modoEdicion && puedeEliminar && (
                            <section className="border-t border-slate-200 pt-5 dark:border-white/10">
                                <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-500/25 dark:bg-rose-500/5">
                                    <h3 className="text-sm font-extrabold text-rose-900 dark:text-rose-200">
                                        Eliminar tarea
                                    </h3>
                                    <p className="mt-1 text-sm leading-relaxed text-rose-700 dark:text-rose-300">
                                        Se moverá a la papelera y podrás restaurarla
                                        después con todo su historial.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={eliminarActual}
                                        disabled={guardando}
                                        className="mt-3 min-h-[44px] rounded-xl border border-rose-300 bg-white px-4 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-500/30 dark:bg-carbon-900 dark:text-rose-300"
                                    >
                                        🗑️ Mover a la papelera
                                    </button>
                                </div>
                            </section>
                        )}

                        {modoEdicion && <TareaHistorial tareaId={form.id} />}
                    </div>

                    <footer className="app-modal-footer">
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
                                    : "Guardar requerimiento"}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
}
