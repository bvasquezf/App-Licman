import { useCallback, useMemo, useState } from "react";
import { useToast } from "../../context/ToastContext";
import { useAsync } from "../../hooks/useAsync";
import { useUrlFilters } from "../../hooks/useUrlFilters";
import { withRetry } from "../../utils/withRetry";
import { supabase } from "../../services/supabase";
import CrearClienteForm from "../../components/equipos/CrearClienteForm";
import ConfirmDialog from "../../components/equipos/ConfirmDialog";
import Skeleton from "../../components/ui/Skeleton";

/**
 * Vista de catálogo de clientes.
 *
 * Lista todos los clientes (activo = true) con búsqueda por razón
 * social, RUT, contacto, comuna o mail. Permite crear nuevos
 * clientes inline (modal) y editar los existentes.
 *
 * Esta vista NO usa el EquiposHeader porque:
 *   - El conteo por bodega no aplica a clientes.
 *   - El correlativo asignado tampoco.
 *   - Los chips de "Inventario Licman" son irrelevantes acá.
 *
 * Para mantener coherencia visual con las demás vistas de Equipos,
 * se renderiza un header propio más simple.
 */

const CAMPOS_BUSQUEDA = [
    "razon_social",
    "rut",
    "contacto",
    "mail",
    "comuna",
    "direccion",
];

export default function ClientesView() {
    const toast = useToast();
    const [filtrosUrl, setFiltroUrl] = useUrlFilters({
        q: "",
        inactivos: "0",
    });
    const busqueda = filtrosUrl.q;
    const mostrarInactivos = filtrosUrl.inactivos === "1";
    const [modalAbierto, setModalAbierto] = useState(false);
    const [clienteEditar, setClienteEditar] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [clienteEliminar, setClienteEliminar] = useState(null);
    const [refsEliminar, setRefsEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    const cargarClientes = useCallback(async () => {
        if (!supabase) return [];
        const { data, error } = await withRetry(() =>
            supabase
                .from("clientes")
                .select(
                    "id, razon_social, rut, contacto, mail, celular, direccion, comuna, activo, created_at",
                )
                .order("razon_social", { ascending: true }),
        );
        if (error) throw error;
        return data ?? [];
    }, []);

    const {
        data: clientes = [],
        loading: cargando,
        refetch: cargar,
    } = useAsync(cargarClientes, {
        errorContexto: "cargar clientes",
        onError: (err) => toast.error(err.message),
    });

    const visibles = useMemo(
        () =>
            mostrarInactivos ? clientes : clientes.filter((c) => c.activo),
        [clientes, mostrarInactivos],
    );

    const filtrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        if (!texto) return visibles;
        return visibles.filter((c) =>
            CAMPOS_BUSQUEDA.some((campo) =>
                String(c[campo] ?? "").toLowerCase().includes(texto),
            ),
        );
    }, [visibles, busqueda]);

    const abrirCrear = () => {
        setClienteEditar(null);
        setModalAbierto(true);
    };

    const abrirEditar = (cliente) => {
        setClienteEditar(cliente);
        setModalAbierto(true);
    };

    const cerrarModal = () => {
        if (guardando) return;
        setModalAbierto(false);
        setClienteEditar(null);
    };

    // Cuenta referencias antes de decidir: con historial se desactiva
    // (soft-delete), sin referencias se elimina definitivamente.
    const abrirEliminar = async (cliente) => {
        setClienteEliminar(cliente);
        setRefsEliminar(null);
        try {
            const [eq, mov] = await Promise.all([
                supabase
                    .from("equipos")
                    .select("*", { count: "exact", head: true })
                    .eq("cliente_id", cliente.id)
                    .is("deleted_at", null),
                supabase
                    .from("equipos_movimientos")
                    .select("*", { count: "exact", head: true })
                    .or(
                        `cliente_origen_id.eq.${cliente.id},cliente_destino_id.eq.${cliente.id}`,
                    ),
            ]);
            setRefsEliminar({
                equipos: eq.count ?? 0,
                movimientos: mov.count ?? 0,
            });
        } catch {
            setRefsEliminar({ equipos: null, movimientos: null });
        }
    };

    const cerrarEliminar = () => {
        if (eliminando) return;
        setClienteEliminar(null);
        setRefsEliminar(null);
    };

    const confirmarEliminar = async () => {
        if (!clienteEliminar) return;
        setEliminando(true);
        try {
            const totalRefs =
                (refsEliminar?.equipos ?? 0) + (refsEliminar?.movimientos ?? 0);
            if (totalRefs > 0 || refsEliminar === null) {
                const { error } = await supabase
                    .from("clientes")
                    .update({ activo: false })
                    .eq("id", clienteEliminar.id);
                if (error) throw error;
                toast.success(
                    "Cliente desactivado: desaparece de las listas pero su historial se mantiene",
                );
            } else {
                const { error } = await supabase
                    .from("clientes")
                    .delete()
                    .eq("id", clienteEliminar.id);
                if (error) throw error;
                toast.success("Cliente eliminado definitivamente");
            }
            cerrarEliminar();
            await cargar();
        } catch (err) {
            toast.error(err?.message ?? "No se pudo eliminar el cliente");
        } finally {
            setEliminando(false);
        }
    };

    const handleReactivar = async (cliente) => {
        try {
            const { error } = await supabase
                .from("clientes")
                .update({ activo: true })
                .eq("id", cliente.id);
            if (error) throw error;
            toast.success("Cliente reactivado");
            await cargar();
        } catch (err) {
            toast.error(err?.message ?? "No se pudo reactivar el cliente");
        }
    };

    const handleSubmit = async (payload) => {
        setGuardando(true);
        try {
            if (clienteEditar?.id) {
                const { error } = await supabase
                    .from("clientes")
                    .update(payload)
                    .eq("id", clienteEditar.id);
                if (error) throw error;
                toast.success("Cliente actualizado");
            } else {
                const { error } = await supabase
                    .from("clientes")
                    .insert(payload);
                if (error) throw error;
                toast.success("Cliente creado");
            }
            cerrarModal();
            await cargar();
        } catch (err) {
            toast.error(err?.message ?? "No se pudo guardar el cliente");
        } finally {
            setGuardando(false);
        }
    };

    return (
        <section className="space-y-4">
            {/* Header propio: branding + botón crear */}
            <header className="rounded-[14px] border border-slate-900 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-[0_10px_30px_rgba(15,23,42,0.25)] sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-white shadow-sm"
                            aria-hidden="true"
                        >
                            <img
                                src="/favicon.png"
                                alt="Licman"
                                className="h-7 w-7 object-contain"
                            />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-base font-extrabold tracking-tight text-white sm:text-lg">
                                Catálogo de clientes
                            </h1>
                            <p className="text-xs font-medium text-slate-300">
                                Empresas que reciben equipos en arriendo, venta o garantía
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={abrirCrear}
                        className="inline-flex items-center gap-2 rounded-[10px] bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] transition hover:bg-blue-700 active:scale-95"
                    >
                        <span aria-hidden="true">+</span> Agregar nuevo
                    </button>
                </div>
            </header>

            {/* Card principal */}
            <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.10)] sm:p-6 dark:border-white/10 dark:bg-carbon-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-[1.2rem] font-bold text-slate-900 dark:text-slate-100">
                            👥 Clientes registrados
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-neutral-400">
                            {clientes.length === 0 && !cargando
                                ? "Aún no hay clientes en el catálogo."
                                : `${clientes.length} cliente${clientes.length === 1 ? "" : "s"} en el catálogo.`}
                        </p>
                    </div>
                    <input
                        type="search"
                        value={busqueda}
                        onChange={(e) => setFiltroUrl("q", e.target.value)}
                        placeholder="🔍 Buscar por razón social, RUT, contacto, comuna..."
                        className="min-h-[44px] min-w-0 flex-1 rounded-[10px] border-[1.5px] border-slate-300 bg-white px-3 py-2 text-[0.92rem] font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 sm:w-72 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100 dark:placeholder-neutral-500"
                    />
                    <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl px-2 text-[0.8rem] font-semibold text-slate-600 select-none dark:text-neutral-400">
                        <input
                            type="checkbox"
                            checked={mostrarInactivos}
                            onChange={(e) =>
                                setFiltroUrl("inactivos", e.target.checked ? "1" : "0")
                            }
                            className="h-5 w-5 accent-blue-600"
                        />
                        Ver inactivos
                    </label>
                </div>

                {cargando ? (
                    <div className="mt-4 space-y-2" aria-busy="true" aria-label="Cargando clientes">
                        {Array.from({ length: 5 }, (_, index) => (
                            <div
                                key={index}
                                className="rounded-2xl border border-slate-200 p-4 dark:border-white/10"
                            >
                                <div className="flex justify-between gap-3">
                                    <Skeleton className="h-5 w-48" />
                                    <Skeleton className="h-7 w-20 rounded-full" />
                                </div>
                                <Skeleton className="mt-3 h-4 w-2/3" />
                            </div>
                        ))}
                    </div>
                ) : filtrados.length === 0 ? (
                    <div className="mt-4 rounded-[10px] border-2 border-dashed border-slate-300 px-5 py-7 text-center text-sm text-slate-500 dark:border-white/15 dark:text-neutral-400">
                        {clientes.length === 0
                            ? "Aún no hay clientes. Usa «Agregar nuevo» para crear el primero."
                            : "No se encontraron clientes con esos términos."}
                    </div>
                ) : (
                    <ul className="animate-filter-results mt-4 space-y-2">
                        {filtrados.map((c) => (
                            <li
                                key={c.id}
                                className="grid grid-cols-[1fr_auto] items-start gap-3 rounded-[10px] border border-slate-200 bg-white p-3.5 transition hover:border-blue-300 hover:bg-blue-50/40 sm:p-4 dark:border-white/10 dark:bg-carbon-800 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10"
                            >
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                        <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                                            {c.razon_social}
                                        </span>
                                        {c.rut && (
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                                                {c.rut}
                                            </span>
                                        )}
                                        {!c.activo && (
                                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                                                Inactivo
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.82rem] text-slate-600 dark:text-neutral-400">
                                        {c.contacto && (
                                            <span>
                                                <b className="font-semibold text-slate-900 dark:text-slate-100">
                                                    Contacto:
                                                </b>{" "}
                                                {c.contacto}
                                            </span>
                                        )}
                                        {c.mail && (
                                            <span className="truncate">
                                                <b className="font-semibold text-slate-900 dark:text-slate-100">
                                                    Mail:
                                                </b>{" "}
                                                <span className="break-all">
                                                    {c.mail}
                                                </span>
                                            </span>
                                        )}
                                        {c.celular && (
                                            <span>
                                                <b className="font-semibold text-slate-900 dark:text-slate-100">
                                                    Cel:
                                                </b>{" "}
                                                {c.celular}
                                            </span>
                                        )}
                                    </div>

                                    {(c.direccion || c.comuna) && (
                                        <div className="mt-0.5 text-[0.78rem] text-slate-500 dark:text-neutral-400">
                                            {c.direccion && <span>{c.direccion}</span>}
                                            {c.direccion && c.comuna && (
                                                <span> · </span>
                                            )}
                                            {c.comuna && (
                                                <span className="font-semibold text-slate-600 dark:text-neutral-400">
                                                    {c.comuna}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:flex-row sm:items-center">
                                    {c.activo ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => abrirEditar(c)}
                                                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[0.78rem] font-bold text-blue-700 transition hover:-translate-y-px hover:border-blue-300 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:border-blue-500/50 dark:hover:bg-blue-500/20"
                                                aria-label={`Editar ${c.razon_social}`}
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => abrirEliminar(c)}
                                                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[0.78rem] font-bold text-rose-700 transition hover:-translate-y-px hover:border-rose-300 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:border-rose-500/50 dark:hover:bg-rose-500/20"
                                                aria-label={`Eliminar ${c.razon_social}`}
                                            >
                                                🗑 Eliminar
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleReactivar(c)}
                                            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[0.78rem] font-bold text-emerald-700 transition hover:-translate-y-px hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-500/20"
                                            aria-label={`Reactivar ${c.razon_social}`}
                                        >
                                            ♻️ Reactivar
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <CrearClienteForm
                open={modalAbierto}
                clienteInicial={clienteEditar}
                onSubmit={handleSubmit}
                onCancel={cerrarModal}
            />

            <ConfirmDialog
                open={Boolean(clienteEliminar)}
                title={
                    (refsEliminar?.equipos ?? 0) + (refsEliminar?.movimientos ?? 0) > 0 ||
                    refsEliminar === null
                        ? "Desactivar cliente"
                        : "Eliminar cliente"
                }
                message={
                    refsEliminar === null
                        ? `Comprobando referencias de "${clienteEliminar?.razon_social}"…`
                        : (refsEliminar.equipos ?? 0) + (refsEliminar.movimientos ?? 0) > 0
                          ? `"${clienteEliminar?.razon_social}" tiene ${refsEliminar.equipos} equipo(s) y ${refsEliminar.movimientos} movimiento(s) asociados. Se DESACTIVARÁ: desaparece de las listas de selección pero el historial mantiene su nombre. Puedes reactivarlo después marcando «Ver inactivos».`
                          : `"${clienteEliminar?.razon_social}" no tiene equipos ni movimientos asociados. Se eliminará DEFINITIVAMENTE del catálogo.`
                }
                confirmLabel={
                    refsEliminar === null
                        ? "Cargando…"
                        : (refsEliminar.equipos ?? 0) + (refsEliminar.movimientos ?? 0) > 0
                          ? "Desactivar"
                          : "Eliminar definitivamente"
                }
                onConfirm={confirmarEliminar}
                onCancel={cerrarEliminar}
                peligro
            />
        </section>
    );
}
