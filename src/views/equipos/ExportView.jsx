import { useCallback, useMemo, useState } from "react";
import { BODEGAS, PHOTO_EMAIL } from "../../lib/equiposConstants";
import { exportarAExcel } from "../../lib/equiposExport";
import EquiposHeader from "../../components/equipos/EquiposHeader";
import { useToast } from "../../context/ToastContext";
import { useAsync } from "../../hooks/useAsync";
import { withRetry } from "../../utils/withRetry";
import { supabase } from "../../services/supabase";

/**
 * Vista de Exportar inventario (Equipos).
 * Carga los equipos activos desde Supabase y permite exportar a Excel.
 */
export default function ExportView() {
    const toast = useToast();
    const [bodega, setBodega] = useState("todas");

    const cargarEquipos = useCallback(async () => {
        if (!supabase) return [];
        const { data, error } = await withRetry(() =>
            supabase
                .from("equipos")
                .select("*")
                .is("deleted_at", null)
                .order("correlativo", { ascending: true }),
        );
        if (error) throw error;
        return data ?? [];
    }, []);

    const { data: equipos = [], loading: cargando } = useAsync(
        cargarEquipos,
        {
            errorContexto: "cargar equipos para exportar",
            onError: (err) => toast.error(err.message),
        },
    );

    const equiposAExportar = useMemo(() => {
        if (bodega === "todas") return equipos;
        return equipos.filter((e) => e.bodega === bodega);
    }, [equipos, bodega]);

    const handleExportar = () => {
        if (equiposAExportar.length === 0) {
            toast.error("No hay equipos para exportar con ese filtro");
            return;
        }
        try {
            const nombre = exportarAExcel(equiposAExportar, {
                bodega: bodega === "todas" ? null : bodega,
            });
            toast.success(`Exportado: ${nombre}`);
        } catch (err) {
            toast.error(err?.message ?? "Error al generar el Excel");
        }
    };

    return (
        <section className="space-y-4">
            <EquiposHeader
                activeFilter={bodega}
                onFilterBodega={setBodega}
                showCorrelativo={false}
            />

            <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.10)] sm:p-6 dark:border-white/10 dark:bg-carbon-900">
            <h2 className="text-[1.2rem] font-bold text-slate-900 dark:text-slate-100">
                Exportar inventario
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                Descarga la planilla completa en Excel (.xlsx). Puedes filtrar
                por bodega antes de exportar.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-[220px_1fr] sm:items-center">
                <label className="block text-[0.88rem] font-semibold text-slate-900 dark:text-slate-100">
                    Filtrar por bodega
                    <select
                        value={bodega}
                        onChange={(e) => setBodega(e.target.value)}
                        className="mt-1.5 block w-full rounded-[10px] border-[1.5px] border-slate-300 bg-white px-3 py-2.5 text-base font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100"
                    >
                        <option value="todas">Todas</option>
                        {BODEGAS.map((b) => (
                            <option key={b} value={b}>
                                {b}
                            </option>
                        ))}
                    </select>
                </label>
                <div className="rounded-[10px] bg-slate-100 px-3.5 py-3 text-[0.95rem] text-slate-900 dark:bg-white/5 dark:text-slate-100">
                    {cargando ? (
                        "Cargando…"
                    ) : (
                        <>
                            Se exportarán{" "}
                            <strong className="font-extrabold">
                                {equiposAExportar.length}
                            </strong>{" "}
                            registro{equiposAExportar.length === 1 ? "" : "s"}.
                        </>
                    )}
                </div>
            </div>

            <button
                type="button"
                onClick={handleExportar}
                disabled={equiposAExportar.length === 0 || cargando}
                className="mt-5 w-full rounded-[10px] bg-blue-600 px-4 py-4 text-[1.05rem] font-bold text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
                ⬇️ Descargar Excel (.xlsx)
            </button>

            <p className="mt-4 rounded-lg border-l-4 border-amber-600 bg-amber-50 px-3.5 py-3 text-[0.85rem] text-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
                <strong className="font-bold">Recordatorio:</strong> las fotos
                se enviaron a <em>{PHOTO_EMAIL}</em> según protocolo. Este
                Excel no incluye las imágenes, solo el check "Foto enviada".
            </p>
            </div>
        </section>
    );
}