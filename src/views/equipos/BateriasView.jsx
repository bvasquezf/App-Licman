import { useCallback, useMemo, useState } from "react";
import BateriaForm from "../../components/equipos/BateriaForm";
import BateriaHistorialModal from "../../components/equipos/BateriaHistorialModal";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import Skeleton from "../../components/ui/Skeleton";
import { useToast } from "../../context/ToastContext";
import { useAsync } from "../../hooks/useAsync";
import { useUrlFilters } from "../../hooks/useUrlFilters";
import { usaBateriaElectrica } from "../../lib/equiposConstants";
import { supabase } from "../../services/supabase";
import { withRetry } from "../../utils/withRetry";

const CAMPOS_BUSQUEDA = [
    "numero_interno",
    "numero_serie",
    "bodega",
    "estado",
];

const CLASE_ESTADO = {
    Disponible:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300",
    Asignada:
        "bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300",
    "En reparación":
        "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
    Baja: "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-neutral-300",
};

function textoEquipo(equipo) {
    if (!equipo) return "Sin equipo asociado";
    return `${equipo.numero_interno ?? "—"} · ${equipo.tipo_equipo ?? "Equipo"}`;
}

export default function BateriasView() {
    const toast = useToast();
    const [filtrosUrl, setFiltroUrl] = useUrlFilters({
        q: "",
        estado: "todos",
        bodega: "todas",
    });
    const busqueda = filtrosUrl.q;
    const filtroEstado = filtrosUrl.estado;
    const filtroBodega = filtrosUrl.bodega;
    const [formAbierto, setFormAbierto] = useState(false);
    const [historialBateria, setHistorialBateria] = useState(null);

    const cargarBaterias = useCallback(async () => {
        if (!supabase) return [];
        const { data, error } = await withRetry(() =>
            supabase
                .from("baterias")
                .select(
                    "id, numero_interno, numero_serie, voltaje, amperaje, bodega, estado, equipo_id, observaciones, updated_at, equipo:equipos(id, numero_interno, numero_serie, tipo_equipo, marca, modelo, correlativo)",
                )
                .order("numero_interno", { ascending: true }),
        );
        if (error) throw error;
        return data ?? [];
    }, []);

    const {
        data: baterias = [],
        loading: cargando,
        refetch: recargar,
    } = useAsync(cargarBaterias, {
        errorContexto: "cargar inventario de baterías",
        onError: (error) => toast.error(error.message),
    });

    const cargarEquiposElectricos = useCallback(async () => {
        if (!supabase) return [];
        const { data, error } = await withRetry(() =>
            supabase
                .from("equipos")
                .select(
                    "id, correlativo, numero_interno, numero_serie, tipo_equipo, marca, modelo, bodega, cliente_id, horometro, bateria, bateria_serie",
                )
                .is("deleted_at", null)
                .order("numero_interno", { ascending: true }),
        );
        if (error) throw error;
        return (data ?? []).filter(usaBateriaElectrica);
    }, []);

    const { data: equiposElectricos = [] } = useAsync(
        cargarEquiposElectricos,
        {
            errorContexto: "cargar equipos eléctricos",
            onError: (error) => toast.error(error.message),
        },
    );

    const equiposSinBateria = useMemo(() => {
        const asignados = new Set(
            baterias
                .map((bateria) => bateria.equipo_id)
                .filter((equipoId) => equipoId !== null && equipoId !== undefined),
        );
        return equiposElectricos.filter((equipo) => !asignados.has(equipo.id));
    }, [baterias, equiposElectricos]);

    const visibles = useMemo(() => {
        const texto = busqueda
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

        return baterias.filter((bateria) => {
            if (filtroEstado !== "todos" && bateria.estado !== filtroEstado) {
                return false;
            }
            if (
                filtroBodega !== "todas" &&
                (bateria.bodega ?? "") !== filtroBodega
            ) {
                return false;
            }
            if (!texto) return true;

            const equipo = bateria.equipo;
            return CAMPOS_BUSQUEDA.some((campo) =>
                String(bateria[campo] ?? "")
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                    .includes(texto),
            ) || [
                equipo?.numero_interno,
                equipo?.numero_serie,
                equipo?.tipo_equipo,
                equipo?.marca,
                equipo?.modelo,
            ]
                .filter(Boolean)
                .join(" ")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .includes(texto);
        });
    }, [baterias, busqueda, filtroBodega, filtroEstado]);

    const handleRegistrar = async (payload) => {
        try {
            const { error } = await supabase.rpc("insert_bateria", {
                p_bateria: payload,
            });
            if (error) throw error;
            toast.success(
                payload.equipo_id
                    ? `Batería ${payload.numero_interno} registrada y asociada al equipo`
                    : `Batería ${payload.numero_interno} registrada en ${payload.bodega}`,
            );
            setFormAbierto(false);
            await recargar();
            return true;
        } catch (error) {
            toast.error(error?.message ?? "No se pudo registrar la batería");
            return false;
        }
    };

    const disponibles = baterias.filter((bateria) => bateria.estado === "Disponible").length;
    const asignadas = baterias.filter((bateria) => bateria.estado === "Asignada").length;

    return (
        <section className="space-y-4">
            <PageHeader
                title="Baterías eléctricas"
                subtitle="Inventario de baterías grandes, reparables y asociadas a equipos eléctricos"
                icon="🔋"
                actions={
                    <button
                        type="button"
                        onClick={() => setFormAbierto(true)}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
                    >
                        <span aria-hidden="true">+</span> Registrar batería
                    </button>
                }
            />

            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3.5 text-sm text-sky-800 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-200">
                Aquí se controlan únicamente las baterías eléctricas grandes y reparables. Las baterías desechables de equipos no eléctricos no se registran en este inventario.
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Resumen label="Total registradas" valor={baterias.length} icono="🔋" />
                <Resumen label="Disponibles en bodega" valor={disponibles} icono="📦" />
                <Resumen label="Asociadas a equipos" valor={asignadas} icono="🏗️" />
            </div>

            <Card padding="p-4 sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                    <label className="min-w-0 flex-1">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            Buscar batería o equipo
                        </span>
                        <input
                            type="search"
                            value={busqueda}
                            onChange={(event) => setFiltroUrl("q", event.target.value)}
                            placeholder="N° interno, serie, equipo, marca…"
                            className="mt-1 block w-full rounded-xl border-[1.5px] border-slate-300 bg-white px-3 py-2.5 text-base font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100 dark:placeholder-neutral-500"
                        />
                    </label>
                    <label className="lg:w-48">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Estado</span>
                        <select
                            value={filtroEstado}
                            onChange={(event) => setFiltroUrl("estado", event.target.value)}
                            className="mt-1 block min-h-[44px] w-full rounded-xl border-[1.5px] border-slate-300 bg-white px-3 py-2.5 text-base font-medium text-slate-900 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100"
                        >
                            <option value="todos">Todos</option>
                            <option value="Disponible">Disponible</option>
                            <option value="Asignada">Asignada</option>
                            <option value="En reparación">En reparación</option>
                            <option value="Baja">Baja</option>
                        </select>
                    </label>
                    <label className="lg:w-48">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Ubicación</span>
                        <select
                            value={filtroBodega}
                            onChange={(event) => setFiltroUrl("bodega", event.target.value)}
                            className="mt-1 block min-h-[44px] w-full rounded-xl border-[1.5px] border-slate-300 bg-white px-3 py-2.5 text-base font-medium text-slate-900 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100"
                        >
                            <option value="todas">Todas</option>
                            <option value="Antillanca">Antillanca</option>
                            <option value="Cordillera">Cordillera</option>
                        </select>
                    </label>
                </div>

                <p className="mt-4 text-sm text-slate-500 dark:text-neutral-400">
                    Mostrando {visibles.length} de {baterias.length} batería{baterias.length === 1 ? "" : "s"}.
                </p>

                {cargando ? (
                    <div
                        className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2"
                        aria-busy="true"
                        aria-label="Cargando inventario de baterías"
                    >
                        {Array.from({ length: 6 }, (_, index) => (
                            <div
                                key={index}
                                className="rounded-2xl border border-slate-200 p-4 dark:border-white/10"
                            >
                                <div className="flex justify-between gap-3">
                                    <Skeleton className="h-7 w-28" />
                                    <Skeleton className="h-7 w-24 rounded-full" />
                                </div>
                                <Skeleton className="mt-3 h-4 w-2/3" />
                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    <Skeleton className="h-14" />
                                    <Skeleton className="h-14" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : visibles.length === 0 ? (
                    <div className="mt-4">
                        <EmptyState
                            icon="🔋"
                            title={baterias.length === 0 ? "Todavía no hay baterías registradas" : "No se encontraron baterías"}
                            description={baterias.length === 0 ? "Registra la primera batería eléctrica para comenzar a controlar sus cambios." : "Prueba con otra búsqueda o cambia los filtros."}
                            action={
                                baterias.length === 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => setFormAbierto(true)}
                                        className="min-h-[44px] rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                                    >
                                        Registrar primera batería
                                    </button>
                                ) : null
                            }
                        />
                    </div>
                ) : (
                    <>
                        <div
                            key={`tabla-${busqueda}-${filtroEstado}-${filtroBodega}`}
                            className="animate-filter-results mt-4 hidden overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 lg:block"
                        >
                            <table className="w-full table-fixed border-collapse text-left text-sm">
                                <colgroup>
                                    <col className="w-[20%]" />
                                    <col className="w-[17%]" />
                                    <col className="w-[30%]" />
                                    <col className="w-[17%]" />
                                    <col className="w-[16%]" />
                                </colgroup>
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-carbon-800 dark:text-neutral-400">
                                        <th className="px-3 py-3">Batería</th>
                                        <th className="px-3 py-3">Capacidad</th>
                                        <th className="px-3 py-3">Ubicación actual</th>
                                        <th className="px-3 py-3">Estado</th>
                                        <th className="px-3 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibles.map((bateria) => (
                                        <FilaBateria
                                            key={bateria.id}
                                            bateria={bateria}
                                            onHistorial={setHistorialBateria}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div
                            key={`cards-${busqueda}-${filtroEstado}-${filtroBodega}`}
                            className="animate-filter-results mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden"
                        >
                            {visibles.map((bateria) => (
                                <TarjetaBateria
                                    key={bateria.id}
                                    bateria={bateria}
                                    onHistorial={setHistorialBateria}
                                />
                            ))}
                        </div>
                    </>
                )}
            </Card>

            <BateriaForm
                open={formAbierto}
                equipos={equiposSinBateria}
                onSubmit={handleRegistrar}
                onCancel={() => setFormAbierto(false)}
            />

            <BateriaHistorialModal
                open={Boolean(historialBateria)}
                bateria={historialBateria}
                onClose={() => setHistorialBateria(null)}
            />
        </section>
    );
}

function Resumen({ label, valor, icono }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-carbon-900">
            <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-600 dark:text-neutral-400">{label}</span>
                <span className="text-xl" aria-hidden="true">{icono}</span>
            </div>
            <p className="mt-2 text-3xl font-black tabular-nums text-slate-900 dark:text-slate-100">{valor}</p>
        </div>
    );
}

function UbicacionBateria({ bateria }) {
    if (bateria.equipo) {
        return (
            <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">🏗️ {textoEquipo(bateria.equipo)}</p>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                    {bateria.equipo.marca ?? ""} {bateria.equipo.modelo ?? ""}
                </p>
            </div>
        );
    }
    return <span className="font-semibold text-slate-700 dark:text-slate-200">📦 {bateria.bodega ?? "Sin bodega"}</span>;
}

function DatosBateria({ bateria }) {
    return (
        <div>
            <p className="font-mono text-base font-black text-slate-900 dark:text-slate-100">
                {bateria.numero_interno}
            </p>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-neutral-300">Serie {bateria.numero_serie}</p>
        </div>
    );
}

function EstadoBateria({ estado }) {
    return (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${CLASE_ESTADO[estado] ?? CLASE_ESTADO.Baja}`}>
            {estado}
        </span>
    );
}

function AccionesBateria({ bateria, onHistorial }) {
    return (
        <button
            type="button"
            onClick={() => onHistorial(bateria)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-violet-200 bg-violet-50 px-3 text-xs font-bold text-violet-700 transition hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20"
        >
            📜 Historial
        </button>
    );
}

function FilaBateria({ bateria, onHistorial }) {
    return (
        <tr className="border-b border-slate-100 last:border-b-0 dark:border-white/5">
            <td className="px-3 py-3"><DatosBateria bateria={bateria} /></td>
            <td className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-200">
                {bateria.voltaje} V · {bateria.amperaje} Ah
            </td>
            <td className="px-3 py-3"><UbicacionBateria bateria={bateria} /></td>
            <td className="px-3 py-3"><EstadoBateria estado={bateria.estado} /></td>
            <td className="px-3 py-3 text-right"><AccionesBateria bateria={bateria} onHistorial={onHistorial} /></td>
        </tr>
    );
}

function TarjetaBateria({ bateria, onHistorial }) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-carbon-800">
            <div className="flex items-start justify-between gap-3">
                <DatosBateria bateria={bateria} />
                <EstadoBateria estado={bateria.estado} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/[0.04]">
                    <p className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Capacidad</p>
                    <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-100">{bateria.voltaje} V · {bateria.amperaje} Ah</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/[0.04]">
                    <p className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Ubicación</p>
                    <div className="mt-0.5 text-sm"><UbicacionBateria bateria={bateria} /></div>
                </div>
            </div>
            <div className="mt-3">
                <AccionesBateria bateria={bateria} onHistorial={onHistorial} />
            </div>
        </article>
    );
}
