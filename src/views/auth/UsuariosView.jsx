import { useCallback, useMemo, useRef, useState } from "react";
import ConfirmDialog from "../../components/equipos/ConfirmDialog";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useAsync } from "../../hooks/useAsync";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { useUrlFilters } from "../../hooks/useUrlFilters";
import { PERMISOS, inicialesNombre } from "../../lib/authPermissions";
import { supabase } from "../../services/supabase";
import { withRetry } from "../../utils/withRetry";
import { formatearFecha } from "../../utils/format";

const inputClass =
    "min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/15 dark:bg-carbon-800 dark:text-white";

const ESTADO_INVITACION = {
    email: "",
    nombre_completo: "",
    cargo: "",
    rol_codigo: "operador_equipos",
};

async function mensajeErrorFuncion(error, respuesta, respaldo) {
    if (respuesta?.error) return respuesta.error;
    try {
        const detalle = await error?.context?.json?.();
        if (detalle?.error) return detalle.error;
    } catch {
        // La respuesta de la función no siempre expone un cuerpo JSON.
    }
    return error?.message || respaldo;
}

export default function UsuariosView() {
    const toast = useToast();
    const auth = useAuth();
    const esSuperadmin = auth.puede(PERMISOS.SUPERADMIN);
    const [filtrosUrl, setFiltroUrl] = useUrlFilters({
        seccion: "usuarios",
        q: "",
    });
    const seccion = filtrosUrl.seccion === "roles" ? "roles" : "usuarios";
    const busqueda = filtrosUrl.q;
    const [invitando, setInvitando] = useState(false);
    const [invitacion, setInvitacion] = useState(ESTADO_INVITACION);
    const [editorRol, setEditorRol] = useState(null);
    const [rolAEliminar, setRolAEliminar] = useState(null);
    const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);
    const [eliminandoRol, setEliminandoRol] = useState(false);
    const [eliminandoUsuario, setEliminandoUsuario] = useState(false);

    useUnsavedChanges(invitacion, {
        habilitado: Boolean(
            invitacion.email || invitacion.nombre_completo || invitacion.cargo,
        ),
        resetKey: "invitar-usuario",
    });

    const cargar = useCallback(async () => {
        const [usuariosRes, rolesRes, permisosRes] = await Promise.all([
            withRetry(() => supabase.rpc("listar_usuarios_app")),
            withRetry(() => supabase.rpc("listar_roles_app")),
            withRetry(() => supabase.rpc("listar_permisos_app")),
        ]);
        if (usuariosRes.error) throw usuariosRes.error;
        if (rolesRes.error) throw rolesRes.error;
        if (permisosRes.error) throw permisosRes.error;
        return {
            usuarios: usuariosRes.data ?? [],
            roles: rolesRes.data ?? [],
            permisos: permisosRes.data ?? [],
        };
    }, []);

    const {
        data = { usuarios: [], roles: [], permisos: [] },
        loading,
        refetch,
    } = useAsync(cargar, {
        errorContexto: "cargar los usuarios y roles",
        onError: (error) => toast.error(error.message),
    });

    const rolesAsignables = useMemo(
        () =>
            data.roles.filter(
                (rol) =>
                    rol.codigo !== "sin_acceso" &&
                    (esSuperadmin || rol.codigo !== "superadmin"),
            ),
        [data.roles, esSuperadmin],
    );

    const permisosPorCodigo = useMemo(
        () => new Map(data.permisos.map((permiso) => [permiso.codigo, permiso])),
        [data.permisos],
    );

    const rolInvitacion = rolesAsignables.some(
        (rol) => rol.codigo === invitacion.rol_codigo,
    )
        ? invitacion.rol_codigo
        : rolesAsignables[0]?.codigo ?? "";

    const invitar = async (event) => {
        event.preventDefault();
        if (
            !invitacion.email.trim() ||
            !invitacion.nombre_completo.trim() ||
            !rolInvitacion
        ) {
            toast.warning("Ingresa el nombre y correo del usuario");
            return;
        }
        setInvitando(true);
        try {
            const { data: respuesta, error } = await supabase.functions.invoke(
                "invitar-usuario",
                {
                    body: {
                        ...invitacion,
                        rol_codigo: rolInvitacion,
                        redirect_to: `${window.location.origin}/restablecer-clave`,
                    },
                },
            );
            if (error || !respuesta?.ok) {
                throw new Error(
                    await mensajeErrorFuncion(
                        error,
                        respuesta,
                        "No se pudo enviar la invitación",
                    ),
                );
            }
            toast.success(`Invitación enviada a ${invitacion.email}`);
            setInvitacion({
                ...ESTADO_INVITACION,
                rol_codigo: rolesAsignables[0]?.codigo ?? "",
            });
            await refetch();
        } catch (error) {
            const mensaje = String(error?.message ?? "");
            toast.error(
                mensaje.includes("Failed to send") ||
                    mensaje.includes("FunctionsHttpError")
                    ? "No se pudo invitar. Verifica que la función invitar-usuario esté desplegada en Supabase."
                    : mensaje || "No se pudo enviar la invitación",
            );
        } finally {
            setInvitando(false);
        }
    };

    const guardarRol = async (form) => {
        const { error } = await supabase.rpc("guardar_rol_app", {
            p_codigo: editorRol?.rol?.codigo ?? null,
            p_nombre: form.nombre,
            p_descripcion: form.descripcion || null,
            p_permisos: form.permisos,
        });
        if (error) throw error;
        toast.success(editorRol?.rol ? "Rol actualizado" : "Rol creado");
        setEditorRol(null);
        await refetch();
    };

    const eliminarRol = async () => {
        const rol = rolAEliminar;
        if (!rol || eliminandoRol) return;
        setEliminandoRol(true);
        try {
            const { error } = await supabase.rpc("eliminar_rol_app", {
                p_codigo: rol.codigo,
            });
            if (error) throw error;
            toast.success("Rol eliminado");
            setRolAEliminar(null);
            await refetch();
        } catch (error) {
            toast.error(error.message || "No se pudo eliminar el rol");
        } finally {
            setEliminandoRol(false);
        }
    };

    const eliminarUsuario = async () => {
        const usuario = usuarioAEliminar;
        if (!usuario || eliminandoUsuario) return;
        setEliminandoUsuario(true);
        try {
            const { data: respuesta, error } = await supabase.functions.invoke(
                "eliminar-usuario",
                { body: { usuario_id: usuario.id } },
            );
            if (error || !respuesta?.ok) {
                throw new Error(
                    await mensajeErrorFuncion(
                        error,
                        respuesta,
                        "No se pudo eliminar el usuario",
                    ),
                );
            }
            toast.success(`Cuenta de ${usuario.nombre_completo} eliminada`);
            setUsuarioAEliminar(null);
            await refetch();
        } catch (error) {
            const mensaje = String(error?.message ?? "");
            const funcionNoDisponible = [
                "Failed to send",
                "FunctionsFetchError",
                "FunctionsHttpError",
            ].some((textoError) => mensaje.includes(textoError));
            toast.error(
                funcionNoDisponible
                    ? "La función eliminar-usuario no está disponible en Supabase. Debes desplegar las Edge Functions y volver a intentar."
                    : mensaje || "No se pudo eliminar el usuario",
            );
        } finally {
            setEliminandoUsuario(false);
        }
    };

    const texto = busqueda.trim().toLocaleLowerCase("es");
    const usuarios = data.usuarios.filter((usuario) =>
        [usuario.nombre_completo, usuario.email, usuario.cargo, usuario.rol_nombre]
            .filter(Boolean)
            .some((valor) =>
                String(valor).toLocaleLowerCase("es").includes(texto),
            ),
    );

    return (
        <div className="space-y-6">
            <PageHeader
                icon="👥"
                title="Usuarios y accesos"
                subtitle={
                    esSuperadmin
                        ? "Administra personas, crea roles y define permisos por módulo."
                        : "Invita personas y define qué módulos puede usar cada una."
                }
            />

            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-white/5">
                <BotonSeccion
                    activo={seccion === "usuarios"}
                    onClick={() => setFiltroUrl("seccion", "usuarios")}
                    icono="👤"
                    texto={`Usuarios (${data.usuarios.length})`}
                />
                <BotonSeccion
                    activo={seccion === "roles"}
                    onClick={() => setFiltroUrl("seccion", "roles")}
                    icono="🔐"
                    texto={`Roles (${data.roles.filter((rol) => rol.codigo !== "sin_acceso").length})`}
                />
            </div>

            {seccion === "usuarios" ? (
                <>
                    <Card padding="p-5 sm:p-6">
                        <div className="mb-4">
                            <h2 className="text-lg font-black text-slate-950 dark:text-white">
                                Invitar usuario
                            </h2>
                            <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                                Recibirá un correo para crear su contraseña. El rol se puede cambiar después.
                            </p>
                        </div>
                        <form onSubmit={invitar} className="grid gap-3 md:grid-cols-2">
                            <input
                                type="text"
                                value={invitacion.nombre_completo}
                                onChange={(event) =>
                                    setInvitacion((prev) => ({
                                        ...prev,
                                        nombre_completo: event.target.value,
                                    }))
                                }
                                className={inputClass}
                                placeholder="Nombre completo"
                                aria-label="Nombre completo"
                            />
                            <input
                                type="email"
                                value={invitacion.email}
                                onChange={(event) =>
                                    setInvitacion((prev) => ({
                                        ...prev,
                                        email: event.target.value,
                                    }))
                                }
                                className={inputClass}
                                placeholder="correo@licman.cl"
                                aria-label="Correo electrónico"
                            />
                            <input
                                type="text"
                                value={invitacion.cargo}
                                onChange={(event) =>
                                    setInvitacion((prev) => ({
                                        ...prev,
                                        cargo: event.target.value,
                                    }))
                                }
                                className={inputClass}
                                placeholder="Cargo (opcional)"
                                aria-label="Cargo"
                            />
                            <select
                                value={rolInvitacion}
                                onChange={(event) =>
                                    setInvitacion((prev) => ({
                                        ...prev,
                                        rol_codigo: event.target.value,
                                    }))
                                }
                                className={inputClass}
                                aria-label="Rol"
                            >
                                {rolesAsignables.map((rol) => (
                                    <option key={rol.codigo} value={rol.codigo}>
                                        {rol.nombre}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="submit"
                                disabled={invitando}
                                className="min-h-[44px] rounded-xl bg-brand-500 px-4 text-sm font-extrabold text-white hover:bg-brand-600 disabled:opacity-60 md:col-span-2"
                            >
                                {invitando ? "Enviando invitación…" : "Enviar invitación"}
                            </button>
                        </form>
                    </Card>

                    <section className="space-y-3">
                        <input
                            type="search"
                            value={busqueda}
                            onChange={(event) => setFiltroUrl("q", event.target.value)}
                            className={inputClass}
                            placeholder="Buscar por nombre, correo, cargo o rol…"
                            aria-label="Buscar usuarios"
                        />

                        {loading ? (
                            Array.from({ length: 4 }).map((_, index) => (
                                <Skeleton key={index} className="h-44" />
                            ))
                        ) : usuarios.length === 0 ? (
                            <EmptyState
                                icon="👥"
                                title="No hay usuarios para mostrar"
                                description="Invita al primer integrante del equipo o limpia la búsqueda."
                            />
                        ) : (
                            usuarios.map((usuario) => (
                                <UsuarioCard
                                    key={`${usuario.id}:${usuario.rol_codigo}:${usuario.activo}`}
                                    usuario={usuario}
                                    roles={rolesAsignables}
                                    esActual={usuario.id === auth.user?.id}
                                    esSuperadmin={esSuperadmin}
                                    onGuardado={refetch}
                                    onEliminar={() => setUsuarioAEliminar(usuario)}
                                />
                            ))
                        )}
                    </section>
                </>
            ) : (
                <section className="space-y-4">
                    <Card padding="p-4 sm:p-5" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-black text-slate-950 dark:text-white">
                                Roles y permisos
                            </h2>
                            <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                                Cada rol reúne los módulos que podrá utilizar una persona.
                            </p>
                        </div>
                        {esSuperadmin && (
                            <button
                                type="button"
                                onClick={() => setEditorRol({ rol: null })}
                                className="min-h-[44px] rounded-xl bg-brand-500 px-4 text-sm font-extrabold text-white hover:bg-brand-600"
                            >
                                + Crear rol
                            </button>
                        )}
                    </Card>

                    {!esSuperadmin && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100">
                            Puedes revisar los roles, pero solo un superadministrador puede crearlos o editarlos.
                        </div>
                    )}

                    {loading ? (
                        <div className="grid gap-3 md:grid-cols-2">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <Skeleton key={index} className="h-48" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {data.roles
                                .filter((rol) => rol.codigo !== "sin_acceso")
                                .map((rol) => (
                                    <RolCard
                                        key={rol.codigo}
                                        rol={rol}
                                        permisosPorCodigo={permisosPorCodigo}
                                        puedeEditar={
                                            esSuperadmin &&
                                            rol.codigo !== "superadmin"
                                        }
                                        onEditar={() => setEditorRol({ rol })}
                                        onEliminar={() => setRolAEliminar(rol)}
                                    />
                                ))}
                        </div>
                    )}
                </section>
            )}

            {editorRol && (
                <RolEditor
                    rol={editorRol.rol}
                    permisos={data.permisos.filter(
                        (permiso) => permiso.codigo !== PERMISOS.SUPERADMIN,
                    )}
                    onClose={() => setEditorRol(null)}
                    onGuardar={guardarRol}
                />
            )}

            <ConfirmDialog
                open={Boolean(usuarioAEliminar)}
                title="¿Eliminar esta cuenta?"
                message={
                    usuarioAEliminar
                        ? `${usuarioAEliminar.nombre_completo} perderá el acceso y no podrá volver a iniciar sesión. Sus movimientos históricos conservarán su nombre.`
                        : ""
                }
                confirmLabel="Eliminar cuenta"
                loading={eliminandoUsuario}
                loadingLabel="Eliminando…"
                peligro
                onCancel={() => setUsuarioAEliminar(null)}
                onConfirm={eliminarUsuario}
            />

            <ConfirmDialog
                open={Boolean(rolAEliminar)}
                title="¿Eliminar este rol?"
                message={
                    rolAEliminar
                        ? `Se eliminará el rol “${rolAEliminar.nombre}”. Solo se puede hacer si no tiene usuarios asignados.`
                        : ""
                }
                confirmLabel="Eliminar rol"
                loading={eliminandoRol}
                loadingLabel="Eliminando…"
                peligro
                onCancel={() => setRolAEliminar(null)}
                onConfirm={eliminarRol}
            />
        </div>
    );
}

function BotonSeccion({ activo, onClick, icono, texto }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`min-h-[44px] rounded-xl px-3 text-sm font-extrabold transition ${
                activo
                    ? "bg-white text-slate-950 shadow-sm dark:bg-carbon-800 dark:text-white"
                    : "text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white"
            }`}
        >
            <span aria-hidden="true">{icono}</span> {texto}
        </button>
    );
}

function RolCard({
    rol,
    permisosPorCodigo,
    puedeEditar,
    onEditar,
    onEliminar,
}) {
    const esProtegido = rol.codigo === "superadmin";
    const tieneUsuarios = Number(rol.usuarios_asignados ?? 0) > 0;
    const puedeEliminar = puedeEditar && !tieneUsuarios;

    return (
        <Card padding="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 dark:text-white">
                            {rol.nombre}
                        </h3>
                        {esProtegido && (
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                                Protegido
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-neutral-400">
                        {rol.descripcion || "Sin descripción"}
                    </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-neutral-300">
                    {rol.usuarios_asignados ?? 0} usuario{Number(rol.usuarios_asignados) === 1 ? "" : "s"}
                </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
                {(rol.permisos ?? []).map((codigo) => (
                    <span
                        key={codigo}
                        className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-neutral-300"
                    >
                        {permisosPorCodigo.get(codigo)?.nombre ?? codigo}
                    </span>
                ))}
            </div>

            {puedeEditar && (
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 dark:border-white/10">
                    <button
                        type="button"
                        onClick={onEditar}
                        className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
                    >
                        Editar rol
                    </button>
                    <button
                        type="button"
                        onClick={onEliminar}
                        disabled={!puedeEliminar}
                        title={
                            tieneUsuarios
                                ? "Primero asigna otro rol a sus usuarios"
                                : undefined
                        }
                        className="min-h-[44px] rounded-xl border border-rose-200 px-3 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-500/25 dark:text-rose-300 dark:hover:bg-rose-500/10"
                    >
                        Eliminar
                    </button>
                </div>
            )}
        </Card>
    );
}

function RolEditor({ rol, permisos, onClose, onGuardar }) {
    const valoresIniciales = {
        nombre: rol?.nombre ?? "",
        descripcion: rol?.descripcion ?? "",
        permisos: rol?.permisos ?? [],
    };
    const [form, setForm] = useState(valoresIniciales);
    const [guardando, setGuardando] = useState(false);
    const [errorForm, setErrorForm] = useState("");
    const dialogRef = useRef(null);
    const nombreRef = useRef(null);
    const inicialRef = useRef(valoresIniciales);

    useUnsavedChanges(form, {
        habilitado: true,
        resetKey: rol?.codigo ?? "nuevo-rol",
    });

    const intentarCerrar = () => {
        if (guardando) return;
        const tieneCambios =
            JSON.stringify(form) !== JSON.stringify(inicialRef.current);
        if (
            tieneCambios &&
            !window.confirm("Tienes cambios sin guardar. ¿Quieres cerrar igual?")
        ) {
            return;
        }
        onClose();
    };

    useDialogA11y(true, {
        dialogRef,
        onClose: intentarCerrar,
        bloquearCierre: guardando,
    });

    const alternarPermiso = (codigo) => {
        setForm((prev) => ({
            ...prev,
            permisos: prev.permisos.includes(codigo)
                ? prev.permisos.filter((permiso) => permiso !== codigo)
                : [...prev.permisos, codigo],
        }));
        setErrorForm("");
    };

    const enviar = async (event) => {
        event.preventDefault();
        if (!form.nombre.trim()) {
            setErrorForm("Ingresa el nombre del rol");
            nombreRef.current?.focus();
            return;
        }
        if (form.permisos.length === 0) {
            setErrorForm("Selecciona al menos un permiso");
            return;
        }

        setGuardando(true);
        setErrorForm("");
        try {
            await onGuardar(form);
        } catch (error) {
            setErrorForm(error.message || "No se pudo guardar el rol");
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-3 sm:items-center"
            role="presentation"
            onClick={intentarCerrar}
        >
            <form
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="rol-editor-titulo"
                aria-busy={guardando}
                tabIndex={-1}
                onSubmit={enviar}
                onClick={(event) => event.stopPropagation()}
                className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6 dark:bg-carbon-900"
                style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
            >
                <div className="sticky top-0 z-10 -mx-5 -mt-5 flex items-start justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 dark:border-white/10 dark:bg-carbon-900/95">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                            Permisos de acceso
                        </p>
                        <h2 id="rol-editor-titulo" className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                            {rol ? "Editar rol" : "Crear nuevo rol"}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={intentarCerrar}
                        data-dialog-autofocus
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-xl text-slate-600 dark:border-white/10 dark:text-slate-200"
                        aria-label="Cerrar"
                    >
                        ×
                    </button>
                </div>

                <div className="mt-5 grid gap-3">
                    <label className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        Nombre del rol
                        <input
                            ref={nombreRef}
                            value={form.nombre}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    nombre: event.target.value,
                                }))
                            }
                            className={`${inputClass} mt-1`}
                            placeholder="Ej: Encargado de taller"
                        />
                    </label>
                    <label className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        Descripción
                        <textarea
                            rows={2}
                            value={form.descripcion}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    descripcion: event.target.value,
                                }))
                            }
                            className={`${inputClass} mt-1 py-3`}
                            placeholder="Qué trabajo realiza este rol"
                        />
                    </label>
                </div>

                <fieldset className="mt-5">
                    <legend className="text-sm font-black text-slate-900 dark:text-white">
                        Módulos permitidos
                    </legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {permisos.map((permiso) => (
                            <label
                                key={permiso.codigo}
                                className={`flex min-h-[64px] cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                                    form.permisos.includes(permiso.codigo)
                                        ? "border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10"
                                        : "border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={form.permisos.includes(permiso.codigo)}
                                    onChange={() => alternarPermiso(permiso.codigo)}
                                    className="mt-0.5 h-5 w-5 shrink-0 accent-brand-500"
                                />
                                <span>
                                    <span className="block text-sm font-extrabold text-slate-900 dark:text-white">
                                        {permiso.nombre}
                                    </span>
                                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500 dark:text-neutral-400">
                                        {permiso.descripcion}
                                    </span>
                                </span>
                            </label>
                        ))}
                    </div>
                </fieldset>

                {errorForm && (
                    <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                        {errorForm}
                    </p>
                )}

                <div
                    className="sticky bottom-0 z-10 -mx-5 mt-5 grid grid-cols-2 gap-2 border-t border-slate-200 bg-white/95 px-5 pt-4 backdrop-blur sm:-mx-6 sm:px-6 dark:border-white/10 dark:bg-carbon-900/95"
                    style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
                >
                    <button
                        type="button"
                        onClick={intentarCerrar}
                        disabled={guardando}
                        className="min-h-[44px] rounded-xl border border-slate-300 text-sm font-bold text-slate-700 dark:border-white/15 dark:text-slate-200"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={guardando}
                        className="min-h-[44px] rounded-xl bg-brand-500 px-3 text-sm font-extrabold text-white hover:bg-brand-600 disabled:opacity-60"
                    >
                        {guardando ? "Guardando…" : "Guardar rol"}
                    </button>
                </div>
            </form>
        </div>
    );
}

function UsuarioCard({
    usuario,
    roles,
    esActual,
    esSuperadmin,
    onGuardado,
    onEliminar,
}) {
    const toast = useToast();
    const protegido = usuario.rol_codigo === "superadmin" && !esSuperadmin;
    const [form, setForm] = useState({
        nombre_completo: usuario.nombre_completo,
        cargo: usuario.cargo ?? "",
        rol_codigo: usuario.rol_codigo,
        activo: usuario.activo,
    });
    const [guardando, setGuardando] = useState(false);
    const [versionGuardada, setVersionGuardada] = useState(0);

    useUnsavedChanges(form, {
        habilitado: !protegido,
        resetKey: `${usuario.id}:${versionGuardada}`,
    });

    const guardar = async () => {
        if (guardando || protegido) return;
        setGuardando(true);
        try {
            const { error } = await supabase.rpc("actualizar_usuario_app", {
                p_usuario_id: usuario.id,
                p_nombre_completo: form.nombre_completo,
                p_cargo: form.cargo || null,
                p_rol_codigo: form.rol_codigo,
                p_activo: form.activo,
            });
            if (error) throw error;
            setVersionGuardada((version) => version + 1);
            toast.success("Acceso actualizado");
            await onGuardado();
        } catch (error) {
            toast.error(error.message || "No se pudo actualizar el usuario");
        } finally {
            setGuardando(false);
        }
    };

    const opcionesRol = roles.some((rol) => rol.codigo === form.rol_codigo)
        ? roles
        : [
              {
                  codigo: usuario.rol_codigo,
                  nombre: usuario.rol_nombre,
              },
              ...roles,
          ];

    return (
        <Card padding="p-4 sm:p-5">
            <div className="flex items-start gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white ${usuario.activo ? "bg-slate-900 dark:bg-brand-600" : "bg-slate-400"}`}>
                    {inicialesNombre(usuario.nombre_completo)}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-black text-slate-950 dark:text-white">
                            {usuario.nombre_completo}
                        </h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${usuario.activo ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-neutral-400"}`}>
                            {usuario.activo ? "Activo" : "Sin acceso"}
                        </span>
                        {esActual && (
                            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                                Tú
                            </span>
                        )}
                    </div>
                    <p className="truncate text-sm text-slate-500 dark:text-neutral-400">
                        {usuario.email}
                    </p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-neutral-500">
                        Último acceso: {usuario.ultimo_acceso ? formatearFecha(usuario.ultimo_acceso) : "Nunca"}
                    </p>
                </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                    value={form.nombre_completo}
                    disabled={protegido}
                    onChange={(event) =>
                        setForm((prev) => ({ ...prev, nombre_completo: event.target.value }))
                    }
                    className={inputClass}
                    aria-label={`Nombre de ${usuario.nombre_completo}`}
                />
                <input
                    value={form.cargo}
                    disabled={protegido}
                    onChange={(event) =>
                        setForm((prev) => ({ ...prev, cargo: event.target.value }))
                    }
                    className={inputClass}
                    placeholder="Cargo"
                    aria-label={`Cargo de ${usuario.nombre_completo}`}
                />
                <select
                    value={form.rol_codigo}
                    disabled={esActual || protegido}
                    onChange={(event) =>
                        setForm((prev) => ({ ...prev, rol_codigo: event.target.value }))
                    }
                    className={inputClass}
                    aria-label={`Rol de ${usuario.nombre_completo}`}
                >
                    {opcionesRol.map((rol) => (
                        <option key={rol.codigo} value={rol.codigo}>
                            {rol.nombre}
                        </option>
                    ))}
                </select>
                <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200">
                    <input
                        type="checkbox"
                        checked={form.activo}
                        disabled={esActual || protegido}
                        onChange={(event) =>
                            setForm((prev) => ({ ...prev, activo: event.target.checked }))
                        }
                        className="h-5 w-5 accent-brand-500"
                    />
                    Usuario habilitado
                </label>
            </div>

            <div className={`mt-3 grid gap-2 ${esSuperadmin && !esActual ? "grid-cols-[1fr_auto]" : "grid-cols-1"}`}>
                <button
                    type="button"
                    onClick={guardar}
                    disabled={guardando || protegido}
                    className="min-h-[44px] rounded-xl bg-slate-900 px-4 text-sm font-extrabold text-white hover:bg-black disabled:opacity-60 dark:bg-white dark:text-slate-950"
                >
                    {guardando ? "Guardando…" : protegido ? "Acceso protegido" : "Guardar cambios"}
                </button>
                {esSuperadmin && !esActual && (
                    <button
                        type="button"
                        onClick={onEliminar}
                        className="min-h-[44px] rounded-xl border border-rose-200 px-4 text-sm font-extrabold text-rose-700 hover:bg-rose-50 dark:border-rose-500/25 dark:text-rose-300 dark:hover:bg-rose-500/10"
                    >
                        Eliminar
                    </button>
                )}
            </div>
        </Card>
    );
}
