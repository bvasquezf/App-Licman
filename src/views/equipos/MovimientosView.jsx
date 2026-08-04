import { useCallback, useMemo, useState } from "react";
import { supabase } from "../../services/supabase";
import { useToast } from "../../context/ToastContext";
import { useAsync } from "../../hooks/useAsync";
import { withRetry } from "../../utils/withRetry";
import { formatearFecha } from "../../utils/format";
import { BODEGAS, MOTIVOS_MOVIMIENTO, iconoPorMotivo } from "../../lib/equiposConstants";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";

const MAX_MOVIMIENTOS = 200;

const CATEGORIA_LABEL = {
    renovacion: "Renovación",
    garantia: "Garantía",
    fallo: "Fallo postventa",
};

/**
 * MovimientosView
 * ---------------
 * Historial GLOBAL de movimientos de equipos (todas las bodegas y
 * clientes). Complementa el timeline por equipo: permite auditar
 * "qué pasó esta semana" sin entrar equipo por equipo.
 *
 * Carga los últimos MAX_MOVIMIENTOS movimientos y los cruza en
 * memoria con equipos y clientes (queries simples, sin aliases
 * PostgREST frágiles). Los filtros son locales.
 */
export default function MovimientosView() {
    const { showToast } = useToast();
    const [busqueda, setBusqueda] = useState("");
    const [motivoFiltro, setMotivoFiltro] = useState("todos");
    const [bodegaFiltro, setBodegaFiltro] = useState("todas");
    const [clienteFiltro, setClienteFiltro] = useState("todos");
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");

    const cargarTodo = useCallback(async () => {
        const [movsRes, equiposRes, clientesRes] = await Promise.all([
            withRetry(() =>
                supabase
                    .from("equipos_movimientos")
                    .select("*")
                    .order("fecha", { ascending: false })
                    .limit(MAX_MOVIMIENTOS),
            ),
            withRetry(() =>
                supabase
                    .from("equipos")
                    .select("id, correlativo, marca, modelo, numero_interno"),
            ),
            withRetry(() =>
                supabase
                    .from("clientes")
                    .select("id, razon_social")
                    .order("razon_social", { ascending: true }),
            ),
        ]);

        const err = movsRes.error || equiposRes.error || clientesRes.error;
        if (err) throw err;

        const equiposById = new Map(
            (equiposRes.data ?? []).map((e) => [e.id, e]),
        );
        const clientesById = new Map(
            (clientesRes.data ?? []).map((c) => [c.id, c]),
        );

        const movimientos = (movsRes.data ?? []).map((m) => ({
            ...m,
            equipo: equiposById.get(m.equipo_id) ?? null,
            cliente_origen: clientesById.get(m.cliente_origen_id) ?? null,
            cliente_destino: clientesById.get(m.cliente_destino_id) ?? null,
        }));

        return { movimientos, clientes: clientesRes.data ?? [] };
    }, []);

    const { data, loading } = useAsync(cargarTodo, {
        errorContexto: "cargar movimientos de equipos",
        onError: (err) => showToast(err.message, "error"),
    });

    const movimientos = useMemo(() => data?.movimientos ?? [], [data]);
    const clientes = data?.clientes ?? [];

    const filtrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        return movimientos.filter((m) => {
            if (motivoFiltro !== "todos" && m.motivo !== motivoFiltro)
                return false;
            if (
                bodegaFiltro !== "todas" &&
                m.bodega_origen !== bodegaFiltro &&
                m.bodega_destino !== bodegaFiltro
            )
                return false;
            if (
                clienteFiltro !== "todos" &&
                String(m.cliente_origen_id) !== clienteFiltro &&
                String(m.cliente_destino_id) !== clienteFiltro
            )
                return false;
            if (fechaDesde && m.fecha < `${fechaDesde}T00:00:00`) return false;
            if (fechaHasta && m.fecha > `${fechaHasta}T23:59:59`) return false;
            if (!texto) return true;

            const e = m.equipo;
            const haystack = [
                e?.marca,
                e?.modelo,
                e?.numero_interno,
                e ? `#${String(e.correlativo).padStart(4, "0")}` : "",
                e ? String(e.correlativo) : "",
                m.responsable,
                m.notas,
                m.cliente_origen?.razon_social,
                m.cliente_destino?.razon_social,
                m.destino_externo,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return haystack.includes(texto);
        });
    }, [
        movimientos,
        busqueda,
        motivoFiltro,
        bodegaFiltro,
        clienteFiltro,
        fechaDesde,
        fechaHasta,
    ]);

    const limpiarFiltros = () => {
        setBusqueda("");
        setMotivoFiltro("todos");
        setBodegaFiltro("todas");
        setClienteFiltro("todos");
        setFechaDesde("");
        setFechaHasta("");
    };

    const hayFiltrosActivos =
        busqueda ||
        motivoFiltro !== "todos" ||
        bodegaFiltro !== "todas" ||
        clienteFiltro !== "todos" ||
        fechaDesde ||
        fechaHasta;

    const clasesInput =
        "w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100";

    return (
        <div className="space-y-4">
            <PageHeader
                title="Movimientos de equipos"
                subtitle={`Historial global · últimos ${MAX_MOVIMIENTOS} registros`}
                icon="🕓"
            />

            {/* Filtros */}
            <Card padding="p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <input
                        type="search"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar por equipo, correlativo, responsable…"
                        className={clasesInput}
                    />
                    <select
                        value={motivoFiltro}
                        onChange={(e) => setMotivoFiltro(e.target.value)}
                        className={clasesInput}
                    >
                        <option value="todos">Todos los motivos</option>
                        {MOTIVOS_MOVIMIENTO.map((motivo) => (
                            <option key={motivo} value={motivo}>
                                {motivo}
                            </option>
                        ))}
                    </select>
                    <select
                        value={bodegaFiltro}
                        onChange={(e) => setBodegaFiltro(e.target.value)}
                        className={clasesInput}
                    >
                        <option value="todas">Todas las bodegas</option>
                        {BODEGAS.map((b) => (
                            <option key={b} value={b}>
                                {b}
                            </option>
                        ))}
                    </select>
                    <select
                        value={clienteFiltro}
                        onChange={(e) => setClienteFiltro(e.target.value)}
                        className={clasesInput}
                    >
                        <option value="todos">Todos los clientes</option>
                        {clientes.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                                {c.razon_social}
                            </option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={fechaDesde}
                        onChange={(e) => setFechaDesde(e.target.value)}
                        className={clasesInput}
                        aria-label="Desde"
                    />
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={fechaHasta}
                            onChange={(e) => setFechaHasta(e.target.value)}
                            className={clasesInput}
                            aria-label="Hasta"
                        />
                        {hayFiltrosActivos && (
                            <button
                                type="button"
                                onClick={limpiarFiltros}
                                className="shrink-0 rounded-[10px] border border-slate-300 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-white/15 dark:text-neutral-300 dark:hover:bg-white/5"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>
                </div>
            </Card>

            {/* Lista */}
            {loading ? (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-20" />
                    ))}
                </div>
            ) : filtrados.length === 0 ? (
                <EmptyState
                    icon="🕓"
                    title={
                        hayFiltrosActivos
                            ? "Ningún movimiento calza con los filtros"
                            : "Aún no hay movimientos registrados"
                    }
                    description={
                        hayFiltrosActivos
                            ? "Prueba ajustar o limpiar los filtros"
                            : "Cuando muevas un equipo desde el inventario, quedará registrado aquí"
                    }
                />
            ) : (
                <>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                        Mostrando {filtrados.length} de {movimientos.length}{" "}
                        movimientos cargados
                    </p>
                    <ul className="space-y-2">
                        {filtrados.map((m) => (
                            <li key={m.id}>
                                <Card padding="p-3 sm:p-4">
                                    <div className="flex items-start gap-3">
                                        <span
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-base text-white dark:bg-white/10"
                                            aria-hidden="true"
                                        >
                                            {iconoPorMotivo(m.motivo)}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                    {m.equipo ? (
                                                        <>
                                                            <span className="font-mono text-brand-700 dark:text-brand-400">
                                                                #
                                                                {String(
                                                                    m.equipo
                                                                        .correlativo,
                                                                ).padStart(
                                                                    4,
                                                                    "0",
                                                                )}
                                                            </span>{" "}
                                                            {m.equipo.marca}{" "}
                                                            {m.equipo.modelo}
                                                        </>
                                                    ) : (
                                                        "Equipo eliminado"
                                                    )}
                                                </p>
                                                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[0.7rem] font-bold text-violet-800 dark:bg-violet-500/10 dark:text-violet-400">
                                                    {m.motivo}
                                                </span>
                                                {m.categoria && (
                                                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[0.7rem] font-bold text-sky-800 dark:bg-sky-500/10 dark:text-sky-400">
                                                        {CATEGORIA_LABEL[
                                                            m.categoria
                                                        ] ?? m.categoria}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                                                {renderOrigen(m)}
                                                <span className="mx-2 text-slate-400 dark:text-neutral-500">
                                                    →
                                                </span>
                                                <span className="font-semibold text-brand-700 dark:text-brand-400">
                                                    {renderDestino(m)}
                                                </span>
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                                                {formatearFecha(m.fecha)} · 👤{" "}
                                                {m.responsable}
                                            </p>
                                            {m.notas && (
                                                <p className="mt-1.5 rounded border-l-[3px] border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200">
                                                    {m.notas}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}

function renderOrigen(m) {
    if (m.cliente_origen?.razon_social) {
        return `🏢 ${m.cliente_origen.razon_social}`;
    }
    return m.bodega_origen ?? "—";
}

function renderDestino(m) {
    if (m.cliente_destino?.razon_social) {
        return `🏢 ${m.cliente_destino.razon_social}`;
    }
    if (m.destino_externo) return `🔧 ${m.destino_externo}`;
    return m.bodega_destino ?? "—";
}
