import { useCallback, useMemo } from "react";
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
import { useUrlFilters } from "../../hooks/useUrlFilters";

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
    const [filtrosUrl, setFiltroUrl, limpiarFiltrosUrl] = useUrlFilters({
        q: "",
        motivo: "todos",
        bodega: "todas",
        cliente: "todos",
        desde: "",
        hasta: "",
    });
    const busqueda = filtrosUrl.q;
    const motivoFiltro = filtrosUrl.motivo;
    const bodegaFiltro = filtrosUrl.bodega;
    const clienteFiltro = filtrosUrl.cliente;
    const fechaDesde = filtrosUrl.desde;
    const fechaHasta = filtrosUrl.hasta;

    const cargarTodo = useCallback(async () => {
        const [movsRes, equiposRes, clientesRes, perfilesRes] = await Promise.all([
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
                    .select("id, correlativo, tipo_equipo, marca, modelo, numero_interno"),
            ),
            withRetry(() =>
                supabase
                    .from("clientes")
                    .select("id, razon_social")
                    .order("razon_social", { ascending: true }),
            ),
            withRetry(() =>
                supabase.from("perfiles").select("id, nombre_completo"),
            ),
        ]);

        const err =
            movsRes.error ||
            equiposRes.error ||
            clientesRes.error ||
            perfilesRes.error;
        if (err) throw err;

        const equiposById = new Map(
            (equiposRes.data ?? []).map((e) => [e.id, e]),
        );
        const clientesById = new Map(
            (clientesRes.data ?? []).map((c) => [c.id, c]),
        );
        const perfilesById = new Map(
            (perfilesRes.data ?? []).map((perfil) => [perfil.id, perfil]),
        );

        const movimientos = (movsRes.data ?? []).map((m) => ({
            ...m,
            equipo: equiposById.get(m.equipo_id) ?? null,
            cliente_origen: clientesById.get(m.cliente_origen_id) ?? null,
            cliente_destino: clientesById.get(m.cliente_destino_id) ?? null,
            autor: perfilesById.get(m.creado_por) ?? null,
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
                m.autor?.nombre_completo,
                m.notas,
                m.numero_acta,
                m.numero_guia_despacho,
                m.cliente_origen?.razon_social,
                m.cliente_destino?.razon_social,
                m.destino_externo,
                m.bateria_contexto?.numero_interno,
                m.bateria_contexto?.numero_serie,
                m.bateria_contexto?.anterior?.numero_interno,
                m.bateria_contexto?.anterior?.numero_serie,
                m.bateria_contexto?.nueva?.numero_interno,
                m.bateria_contexto?.nueva?.numero_serie,
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

    const hayFiltrosActivos =
        busqueda ||
        motivoFiltro !== "todos" ||
        bodegaFiltro !== "todas" ||
        clienteFiltro !== "todos" ||
        fechaDesde ||
        fechaHasta;

    const clasesInput =
        "min-h-[44px] w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 sm:text-sm dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100";

    return (
        <div className="space-y-4">
            <PageHeader
                title="Movimientos de equipos"
                subtitle={`Equipos y baterías asociadas · últimos ${MAX_MOVIMIENTOS} registros`}
                icon="🕓"
            />

            {/* Filtros */}
            <Card padding="p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <input
                        type="search"
                        aria-label="Buscar movimientos de equipos"
                        value={busqueda}
                        onChange={(e) => setFiltroUrl("q", e.target.value)}
                        placeholder="Buscar por equipo, correlativo, responsable…"
                        className={clasesInput}
                    />
                    <select
                        value={motivoFiltro}
                        onChange={(e) => setFiltroUrl("motivo", e.target.value)}
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
                        onChange={(e) => setFiltroUrl("bodega", e.target.value)}
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
                        onChange={(e) => setFiltroUrl("cliente", e.target.value)}
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
                        onChange={(e) => setFiltroUrl("desde", e.target.value)}
                        className={clasesInput}
                        aria-label="Desde"
                    />
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={fechaHasta}
                            onChange={(e) => setFiltroUrl("hasta", e.target.value)}
                            className={clasesInput}
                            aria-label="Hasta"
                        />
                        {hayFiltrosActivos && (
                            <button
                                type="button"
                                onClick={limpiarFiltrosUrl}
                                className="min-h-[44px] shrink-0 rounded-[10px] border border-slate-300 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-white/15 dark:text-neutral-300 dark:hover:bg-white/5"
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
                                    <div className="flex items-start gap-2.5 sm:gap-3">
                                        <span
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-base text-white dark:bg-white/10"
                                            aria-hidden="true"
                                        >
                                            {iconoPorMotivo(m.motivo)}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
                                                <div className="min-w-0 basis-full sm:basis-auto">
                                                    {m.equipo ? (
                                                        <>
                                                            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                                                <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                                                                    N° interno
                                                                </span>
                                                                <span className="font-mono text-xl font-black leading-none text-slate-950 dark:text-white">
                                                                    {m.equipo.numero_interno || "—"}
                                                                </span>
                                                                <span className="text-xs font-medium tabular-nums text-slate-400 dark:text-neutral-500">
                                                                    · ID {String(m.equipo.correlativo).padStart(4, "0")}
                                                                </span>
                                                            </p>
                                                            <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                                                                {m.equipo.tipo_equipo || "Equipo"}
                                                            </p>
                                                            <p className="text-sm font-semibold text-slate-600 dark:text-neutral-300">
                                                                {m.equipo.marca} {m.equipo.modelo}
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <p className="text-sm font-semibold text-slate-600 dark:text-neutral-300">
                                                            Equipo eliminado
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-800 dark:bg-violet-500/10 dark:text-violet-400">
                                                    {m.motivo}
                                                </span>
                                                {m.categoria && (
                                                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800 dark:bg-sky-500/10 dark:text-sky-400">
                                                        {CATEGORIA_LABEL[
                                                            m.categoria
                                                        ] ?? m.categoria}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-2 break-words text-sm text-slate-700 dark:text-slate-200">
                                                <span className="block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-neutral-400 sm:inline sm:normal-case sm:tracking-normal">
                                                    Desde{" "}
                                                </span>
                                                {renderOrigen(m)}
                                                <span className="mx-1.5 text-slate-400 dark:text-neutral-500 sm:mx-2">
                                                    →
                                                </span>
                                                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-neutral-400 sm:hidden">
                                                    Hasta{" "}
                                                </span>
                                                <span className="font-semibold text-brand-700 dark:text-brand-400">
                                                    {renderDestino(m)}
                                                </span>
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                                                {formatearFecha(m.fecha)} · Responsable: {m.responsable}
                                            </p>
                                            <p className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-neutral-300">
                                                Registrado por: {m.autor?.nombre_completo ?? "Registro anterior al inicio de sesión"}
                                            </p>
                                            {m.notas && (
                                                <p className="mt-1.5 rounded border-l-[3px] border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200">
                                                    {m.notas}
                                                </p>
                                            )}
                                            <BateriaContexto
                                                contexto={m.bateria_contexto}
                                            />
                                            {m.horometro !== null &&
                                                m.horometro !== undefined && (
                                                    <p className="mt-1.5 text-xs text-slate-600 dark:text-neutral-300">
                                                        ⏱ Horómetro:{" "}
                                                        <strong>{m.horometro} h</strong>
                                                    </p>
                                                )}
                                            {(m.numero_acta ||
                                                m.numero_guia_despacho) && (
                                                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-neutral-300">
                                                    {m.numero_acta && (
                                                        <span>
                                                            📄 Acta:{" "}
                                                            <strong>{m.numero_acta}</strong>
                                                        </span>
                                                    )}
                                                    {m.numero_guia_despacho && (
                                                        <span>
                                                            🚚 Guía:{" "}
                                                            <strong>
                                                                {m.numero_guia_despacho}
                                                            </strong>
                                                        </span>
                                                    )}
                                                </div>
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

function BateriaContexto({ contexto }) {
    if (!contexto) return null;

    if (contexto.tipo === "acompanante") {
        return (
            <p className="mt-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-900 dark:border-cyan-500/25 dark:bg-cyan-500/10 dark:text-cyan-100">
                🔋 Batería <strong className="font-mono">{contexto.numero_interno || "—"}</strong>
                {contexto.numero_serie ? ` · Serie ${contexto.numero_serie}` : ""}
            </p>
        );
    }

    if (contexto.tipo === "cambio") {
        return (
            <div className="mt-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-900 dark:border-cyan-500/25 dark:bg-cyan-500/10 dark:text-cyan-100">
                <p className="font-bold">🔋 Cambio asociado</p>
                <p className="mt-0.5">
                    {contexto.anterior?.numero_interno || "Sin batería anterior"}
                    {" → "}
                    {contexto.nueva?.numero_interno || "Sin batería nueva"}
                </p>
            </div>
        );
    }

    return null;
}
