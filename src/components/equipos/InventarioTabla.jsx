import { useEffect, useRef, useState } from "react";
import {
    ELEMENTOS_FALTANTES,
    usaBateriaElectrica,
} from "../../lib/equiposConstants";
import {
    formatearCapacidad,
    mostrarDato,
    parseFaltantes,
} from "../../lib/equiposPresentacion";
import { formatearFechaCorta } from "../../utils/format";
import EquipoFoto from "./EquipoFoto";
import EstadoBadge from "./EstadoBadge";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";

function tieneIdentificadorBateriaLegacy(equipo) {
    const esMarcador = (valor) => {
        const texto = String(valor ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[._-]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        if (!texto) return true;
        return /^(sin (bat|bateria|numero)|s\/?b|no|no tiene|ninguna|revisar|mala|muerta|buena|descargad[ao]|x+|48 ?v|48 vol)$/.test(
            texto,
        );
    };

    return [equipo?.bateria, equipo?.bateria_serie].some(
        (valor) => !esMarcador(valor),
    );
}

function BateriaResumen({ equipo, compacto = false }) {
    if (!usaBateriaElectrica(equipo)) {
        return (
            <span className="text-xs font-semibold text-slate-400 dark:text-neutral-500">
                No aplica
            </span>
        );
    }

    if (equipo.bateria_asociada) {
        return (
            <span
                className="inline-flex max-w-full flex-col rounded-xl bg-cyan-50 px-2.5 py-1.5 text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-200"
                title={`Batería asociada · Serie ${equipo.bateria_asociada.numero_serie || "sin registrar"}`}
            >
                <span className="truncate text-xs font-black">
                    🔋 {equipo.bateria_asociada.numero_interno || "Sin N° interno"}
                </span>
                {!compacto && (
                    <span className="truncate text-xs font-semibold opacity-80">
                        Serie {equipo.bateria_asociada.numero_serie || "—"}
                    </span>
                )}
            </span>
        );
    }

    if (equipo.bateria || equipo.bateria_serie) {
        const identificadorPendiente = tieneIdentificadorBateriaLegacy(equipo);
        return (
            <span
                className={`inline-flex max-w-full flex-col rounded-xl px-2.5 py-1.5 ${
                    identificadorPendiente
                        ? "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
                        : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-neutral-300"
                }`}
                title={
                    identificadorPendiente
                        ? "Dato importado pendiente de asociar a una batería del inventario"
                        : "La planilla antigua indicaba que no había una batería identificada"
                }
            >
                <span className="truncate text-xs font-black">
                    {identificadorPendiente
                        ? "⚠ Pendiente de asociar"
                        : "Sin batería identificada"}
                </span>
                {!compacto && identificadorPendiente && (
                    <span className="truncate text-xs font-semibold opacity-80">
                        {equipo.bateria || "Sin N°"} · Serie {equipo.bateria_serie || "—"}
                    </span>
                )}
            </span>
        );
    }

    return (
        <span className="inline-flex rounded-xl border border-dashed border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-500 dark:border-white/15 dark:text-neutral-400">
            Sin batería asociada
        </span>
    );
}

function RetornoClientePendiente({ equipo, clientesById }) {
    if (!equipo.cliente_retorno_id) return null;

    const nombre =
        clientesById.get(equipo.cliente_retorno_id)?.razon_social ??
        `Cliente #${equipo.cliente_retorno_id}`;

    return (
        <span
            className="inline-flex max-w-full items-center truncate rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-800 dark:bg-violet-500/15 dark:text-violet-300"
            title={`Reparación con retorno pendiente a ${nombre}`}
        >
            🛠️ Retorno pendiente: {nombre}
        </span>
    );
}

function EquipoFilaMobile({
    equipo,
    esDuplicado,
    clientesById,
    onOpen,
    onMover,
    onEstado,
    onHistorial,
    onBateria,
}) {
    const faltantes = parseFaltantes(equipo.elementos_faltantes);
    const ubicacion = equipo.cliente_id
        ? clientesById.get(equipo.cliente_id)?.razon_social ??
          `Cliente #${equipo.cliente_id}`
        : equipo.bodega || equipo.ubicacion_actual || "Sin ubicación";

    return (
        <article
            className={`overflow-hidden rounded-2xl border ${
                esDuplicado
                    ? "border-red-300 bg-red-50/70 dark:border-red-500/30 dark:bg-red-500/10"
                    : "border-slate-200/90 bg-white shadow-[0_3px_14px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-carbon-900/95"
            }`}
        >
            <button
                type="button"
                onClick={() => onOpen(equipo)}
                className="block min-h-[44px] w-full px-3.5 pb-3 pt-3.5 text-left active:bg-slate-50 dark:active:bg-white/5"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-neutral-400">
                            N° interno
                        </p>
                        <p
                            className={`mt-0.5 truncate font-mono text-2xl font-black leading-none tracking-tight ${
                                esDuplicado
                                    ? "text-red-700 dark:text-red-400"
                                    : "text-slate-950 dark:text-white"
                            }`}
                        >
                            {esDuplicado ? "⚠ " : ""}
                            {mostrarDato(equipo.numero_interno)}
                        </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium tabular-nums text-slate-400 dark:text-neutral-500">
                        ID {String(equipo.correlativo ?? "—").padStart(4, "0")}
                    </span>
                </div>
                <p className="mt-2 truncate text-base font-extrabold leading-tight text-slate-800 dark:text-slate-100">
                    {mostrarDato(equipo.tipo_equipo)}
                </p>
                <p className="truncate text-sm font-semibold text-slate-600 dark:text-neutral-300">
                    {mostrarDato(equipo.marca)} {equipo.modelo || ""}
                </p>
            </button>

            <div className="flex flex-wrap items-center gap-1.5 border-y border-slate-100 px-3.5 py-2.5 dark:border-white/5">
                <EstadoBadge estado={equipo.estado_operacional} />
                <span className="inline-flex max-w-full items-center truncate rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800 dark:bg-sky-500/10 dark:text-sky-400">
                    {equipo.cliente_id ? "🏢" : "📍"} {ubicacion}
                </span>
                <RetornoClientePendiente
                    equipo={equipo}
                    clientesById={clientesById}
                />
                {faltantes.length > 0 && (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-500/10 dark:text-red-400">
                        ⚠ {faltantes.length} faltante
                        {faltantes.length === 1 ? "" : "s"}
                    </span>
                )}
                {usaBateriaElectrica(equipo) && (
                    <BateriaResumen equipo={equipo} compacto />
                )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 px-3.5 py-2 text-xs text-slate-600 dark:text-neutral-300">
                <span>⚖ {formatearCapacidad(equipo.capacidad_kg)}</span>
                <span>↕ {mostrarDato(equipo.altura)}</span>
                {equipo.horometro !== null &&
                    equipo.horometro !== undefined &&
                    equipo.horometro !== "" && (
                        <span>⏱ {equipo.horometro} h</span>
                    )}
            </div>

            <div
                className={`grid gap-2 border-t border-slate-100 p-3 dark:border-white/5 ${
                    usaBateriaElectrica(equipo)
                        ? "grid-cols-2"
                        : "grid-cols-3"
                }`}
            >
                <button
                    type="button"
                    onClick={() => onMover(equipo)}
                    className="flex min-h-[44px] items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700 active:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:active:bg-blue-500/20"
                >
                    {equipo.cliente_retorno_id
                        ? "↩️ Resolver"
                        : "🔄 Mover"}
                </button>
                <button
                    type="button"
                    onClick={() => onEstado(equipo)}
                    className="flex min-h-[44px] items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-2 text-xs font-bold text-emerald-700 active:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:active:bg-emerald-500/20"
                >
                    🛠 Estado
                </button>
                <button
                    type="button"
                    onClick={() => onHistorial(equipo)}
                    className="flex min-h-[44px] items-center justify-center rounded-xl border border-violet-200 bg-violet-50 px-2 text-xs font-bold text-violet-700 active:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400 dark:active:bg-violet-500/20"
                >
                    📜 Historial
                </button>
                {usaBateriaElectrica(equipo) && (
                    <button
                        type="button"
                        onClick={() => onBateria(equipo)}
                        className="flex min-h-[44px] items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 px-2 text-xs font-bold text-cyan-700 active:bg-cyan-100 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-400 dark:active:bg-cyan-500/20"
                    >
                        🔋 Batería
                    </button>
                )}
            </div>
        </article>
    );
}

function EncabezadoOrdenable({
    campo,
    label,
    ordenCampo,
    ordenDireccion,
    onOrdenar,
    className = "",
}) {
    const activo = ordenCampo === campo;
    return (
        <th
            className={`px-2.5 py-1.5 align-middle text-xs font-bold uppercase tracking-wide ${className}`}
            aria-sort={
                activo
                    ? ordenDireccion === "asc"
                        ? "ascending"
                        : "descending"
                    : "none"
            }
        >
            <button
                type="button"
                onClick={() => onOrdenar(campo)}
                className={`flex min-h-[44px] w-full items-center gap-1 rounded-lg text-left transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:hover:text-blue-300 ${
                    className.includes("text-center") ? "justify-center" : ""
                }`}
                title={`Ordenar por ${label.toLowerCase()}`}
            >
                <span>{label}</span>
                <span
                    aria-hidden="true"
                    className={`text-base leading-none ${
                        activo
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-slate-400 dark:text-neutral-500"
                    }`}
                >
                    {activo ? (ordenDireccion === "asc" ? "↑" : "↓") : "↕"}
                </span>
            </button>
        </th>
    );
}

/**
 * TablaEquipos
 * ------------
 * Vista tabular del inventario (alternativa a las cards). Recibe la
 * página actual ya filtrada/ordenada y los mismos handlers de acciones
 * que usan las cards (mover, historial, eliminar, ver foto), así no se
 * duplica lógica. En móvil y tablet usa cards; en escritorio muestra una
 * tabla compacta que se adapta al ancho disponible sin scroll horizontal.
 */
export function TablaEquipos({
    equipos,
    duplicados,
    clientesById,
    ordenCampo,
    ordenDireccion,
    onOrdenar,
    onMover,
    onEstado,
    onHistorial,
    onBateria,
    onVerFoto,
    onEliminar,
    onGuardarEdicion,
}) {
    const [equipoDetalle, setEquipoDetalle] = useState(null);
    return (
        <>
            <div className="animate-filter-results mt-4 hidden overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 lg:block">
                <table className="w-full table-fixed border-collapse text-left text-[0.82rem]">
                <colgroup>
                    <col className="w-[13%]" />
                    <col className="w-[25%]" />
                    <col className="w-[26%]" />
                    <col className="hidden w-[18%] xl:table-column" />
                    <col className="w-[9%]" />
                    <col className="w-[120px]" />
                </colgroup>
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-carbon-800 dark:text-neutral-400">
                        <EncabezadoOrdenable
                            campo="numero_interno"
                            label="N° interno"
                            ordenCampo={ordenCampo}
                            ordenDireccion={ordenDireccion}
                            onOrdenar={onOrdenar}
                        />
                        <EncabezadoOrdenable
                            campo="tipo_equipo"
                            label="Equipo"
                            ordenCampo={ordenCampo}
                            ordenDireccion={ordenDireccion}
                            onOrdenar={onOrdenar}
                        />
                        <EncabezadoOrdenable
                            campo="estado_operacional"
                            label="Estado / ubicación"
                            ordenCampo={ordenCampo}
                            ordenDireccion={ordenDireccion}
                            onOrdenar={onOrdenar}
                        />
                        <EncabezadoOrdenable
                            campo="horometro"
                            label="Detalles"
                            ordenCampo={ordenCampo}
                            ordenDireccion={ordenDireccion}
                            onOrdenar={onOrdenar}
                            className="hidden xl:table-cell"
                        />
                        <EncabezadoOrdenable
                            campo="faltantes"
                            label="Falt."
                            ordenCampo={ordenCampo}
                            ordenDireccion={ordenDireccion}
                            onOrdenar={onOrdenar}
                            className="text-center"
                        />
                        <th className="px-2.5 py-2.5 text-right text-xs font-bold uppercase tracking-wide">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {equipos.map((e) => {
                        const faltantes = parseFaltantes(
                            e.elementos_faltantes,
                        );
                        const correlativo = e.correlativo ?? "—";
                        const dupKey = `${e.bodega}|${e.numero_interno}`;
                        const esDuplicado = duplicados.has(dupKey);
                        return (
                            <tr
                                key={e.id}
                                onClick={() => setEquipoDetalle(e)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        setEquipoDetalle(e);
                                    }
                                }}
                                tabIndex={0}
                                aria-label={`Abrir ficha del equipo ${e.numero_interno || e.correlativo}`}
                                className={`cursor-pointer border-b border-slate-100 transition last:border-b-0 dark:border-white/5 ${
                                    esDuplicado
                                        ? "bg-red-50/40 hover:bg-red-50 dark:bg-red-500/10 dark:hover:bg-red-500/15"
                                        : "hover:bg-slate-50 dark:hover:bg-white/5"
                                }`}
                            >
                                <td className="px-2.5 py-3 align-top">
                                    <div className="min-w-0">
                                        <span
                                            className={`block truncate font-mono text-lg font-black tabular-nums ${
                                                esDuplicado
                                                    ? "text-red-700 dark:text-red-400"
                                                    : "text-slate-950 dark:text-white"
                                            }`}
                                            title={e.numero_interno || "Sin N° interno"}
                                        >
                                            {esDuplicado ? "⚠ " : ""}
                                            {mostrarDato(e.numero_interno)}
                                        </span>
                                        <span className="text-xs font-medium tabular-nums text-slate-400 dark:text-neutral-500">
                                            ID {String(correlativo).padStart(4, "0")}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-2.5 py-3 align-top">
                                    <div className="flex min-w-0 items-start gap-2.5">
                                        <EquipoFoto
                                            path={e.foto_url || null}
                                            size="sm"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onVerFoto(e.foto_url || null);
                                            }}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <span
                                                className="block truncate font-bold text-slate-900 dark:text-slate-100"
                                                title={mostrarDato(e.tipo_equipo)}
                                            >
                                                {mostrarDato(e.tipo_equipo)}
                                            </span>
                                            <span
                                                className="block truncate text-sm font-semibold text-slate-600 dark:text-neutral-300"
                                                title={`${mostrarDato(e.marca)} ${e.modelo || ""}`}
                                            >
                                                {mostrarDato(e.marca)} {e.modelo || ""}
                                            </span>
                                            {e.numero_serie && (
                                                <span
                                                    className="block truncate text-[0.78rem] text-slate-500 dark:text-neutral-400"
                                                    title={`Serie: ${e.numero_serie}`}
                                                >
                                                    Serie: {e.numero_serie}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-2.5 py-3 align-top">
                                    <EstadoBadge
                                        estado={e.estado_operacional}
                                    />
                                    {e.cliente_id ? (
                                        <span
                                            className="mt-1 block max-w-full truncate rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800 dark:bg-sky-500/10 dark:text-sky-400"
                                            title={
                                                clientesById.get(e.cliente_id)
                                                    ?.razon_social ??
                                                `Cliente #${e.cliente_id}`
                                            }
                                        >
                                            🏢{" "}
                                            {clientesById.get(e.cliente_id)
                                                ?.razon_social ??
                                                `Cliente #${e.cliente_id}`}
                                        </span>
                                    ) : (
                                        <span className="mt-1 block truncate font-medium text-slate-700 dark:text-slate-200">
                                            {e.bodega}
                                        </span>
                                    )}
                                    {e.ubicacion_actual && (
                                        <span
                                            className="block truncate text-[0.78rem] text-slate-500 dark:text-neutral-400"
                                            title={e.ubicacion_actual}
                                        >
                                            📍 {e.ubicacion_actual}
                                        </span>
                                    )}
                                    {e.cliente_retorno_id && (
                                        <span className="mt-1 block">
                                            <RetornoClientePendiente
                                                equipo={e}
                                                clientesById={clientesById}
                                            />
                                        </span>
                                    )}
                                </td>
                                <td className="hidden px-2.5 py-3 align-top xl:table-cell">
                                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-slate-700 dark:text-slate-200">
                                        <span>⚖ {formatearCapacidad(e.capacidad_kg)}</span>
                                        <span>↕ {mostrarDato(e.altura)}</span>
                                    </div>
                                    {e.horometro !== null &&
                                        e.horometro !== undefined &&
                                        e.horometro !== "" && (
                                            <span className="mt-1 block text-xs text-slate-500 dark:text-neutral-400">
                                                ⏱ {e.horometro} h
                                            </span>
                                        )}
                                    <div className="mt-1.5 max-w-full">
                                        <BateriaResumen equipo={e} compacto />
                                    </div>
                                </td>
                                <td className="px-2 py-3 text-center align-top">
                                    {faltantes.length > 0 ? (
                                        <span
                                            className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full bg-red-100 px-2 font-bold text-red-700 dark:bg-red-500/15 dark:text-red-400"
                                            title={faltantes.join(", ")}
                                        >
                                            {faltantes.length}
                                        </span>
                                    ) : (
                                        <span className="text-slate-400 dark:text-neutral-500">
                                            —
                                        </span>
                                    )}
                                </td>
                                <td className="px-2 py-3 align-top">
                                    <div className="ml-auto grid w-[94px] grid-cols-2 justify-items-end gap-1.5">
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onMover(e);
                                            }}
                                            className="flex h-11 w-11 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:border-blue-500/50 dark:hover:bg-blue-500/20"
                                            title={
                                                e.cliente_retorno_id
                                                    ? "Resolver el retorno pendiente de esta reparación"
                                                    : "Registrar un traslado o cambio de ubicación"
                                            }
                                            aria-label={`Mover ${e.marca} ${e.modelo}`}
                                        >
                                            🔄
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onEstado(e);
                                            }}
                                            className="flex h-11 w-11 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                                            title="Cambiar el estado operacional (ej. tras una reparación)"
                                            aria-label={`Cambiar estado de ${e.marca} ${e.modelo}`}
                                        >
                                            🛠️
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onHistorial(e);
                                            }}
                                            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200 dark:hover:bg-white/10"
                                            title="Ver historial completo de movimientos"
                                            aria-label={`Ver historial de ${e.marca} ${e.modelo}`}
                                        >
                                            📜
                                        </button>
                                        {usaBateriaElectrica(e) && (
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onBateria(e);
                                                }}
                                                className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-200 bg-cyan-50 text-cyan-700 transition hover:border-cyan-300 hover:bg-cyan-100 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-400 dark:hover:bg-cyan-500/20"
                                                title="Asociar o cambiar batería eléctrica"
                                                aria-label={`Cambiar batería de ${e.marca} ${e.modelo}`}
                                            >
                                                🔋
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                </table>
            </div>

            <div className="animate-filter-results mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
                {equipos.map((e) => (
                    <EquipoFilaMobile
                        key={e.id}
                        equipo={e}
                        esDuplicado={duplicados.has(
                            `${e.bodega}|${e.numero_interno}`,
                        )}
                        clientesById={clientesById}
                        onOpen={setEquipoDetalle}
                        onMover={onMover}
                        onEstado={onEstado}
                        onHistorial={onHistorial}
                        onBateria={onBateria}
                    />
                ))}
            </div>

            {equipoDetalle && (
                <EquipoDetallePanel
                    equipo={equipoDetalle}
                    clientesById={clientesById}
                    onClose={() => setEquipoDetalle(null)}
                    onMover={onMover}
                    onEstado={onEstado}
                    onHistorial={onHistorial}
                    onBateria={onBateria}
                    onEliminar={(equipoSeleccionado) =>
                        onEliminar(equipoSeleccionado.id)
                    }
                    onVerFoto={onVerFoto}
                    onGuardarEdicion={onGuardarEdicion}
                />
            )}
        </>
    );
}

const CLASES_INPUT_EDICION =
    "mt-1 block w-full rounded-xl border-[1.5px] border-slate-300 bg-white px-3 py-2.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100 dark:placeholder-neutral-500";

function valoresEdicionEquipo(equipo) {
    return {
        tipo_equipo: equipo.tipo_equipo ?? "",
        numero_interno: equipo.numero_interno ?? "",
        numero_serie: equipo.numero_serie ?? "",
        marca: equipo.marca ?? "",
        modelo: equipo.modelo ?? "",
        ubicacion_actual: equipo.ubicacion_actual ?? "",
        horometro:
            equipo.horometro === null || equipo.horometro === undefined
                ? ""
                : String(equipo.horometro),
        elementos_faltantes: parseFaltantes(equipo.elementos_faltantes),
        observaciones: equipo.observaciones ?? "",
        responsable: equipo.responsable ?? "",
        capacidad_kg:
            equipo.capacidad_kg === null || equipo.capacidad_kg === undefined
                ? ""
                : String(equipo.capacidad_kg),
        mastil: equipo.mastil ?? "",
        anio:
            equipo.anio === null || equipo.anio === undefined
                ? ""
                : String(equipo.anio),
        altura: equipo.altura ?? "",
    };
}

function EquipoEdicionForm({
    equipo,
    onCancel,
    onSaved,
    onSubmit,
    onDirtyChange,
}) {
    const valoresIniciales = valoresEdicionEquipo(equipo);
    const [form, setForm] = useState(() => valoresIniciales);
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(false);
    const inicialRef = useRef(valoresIniciales);
    const refs = useRef({});
    const faltantesFueraCatalogo = parseFaltantes(
        equipo.elementos_faltantes,
    ).filter((elemento) => !ELEMENTOS_FALTANTES.includes(elemento));
    const opcionesFaltantes = [
        ...ELEMENTOS_FALTANTES,
        ...faltantesFueraCatalogo,
    ];
    const estaSucio =
        JSON.stringify(form) !== JSON.stringify(inicialRef.current);

    useUnsavedChanges(form, {
        habilitado: !guardando,
        resetKey: equipo.id,
    });

    useEffect(() => {
        onDirtyChange?.(estaSucio);
    }, [estaSucio, onDirtyChange]);

    const cancelar = () => {
        if (
            estaSucio &&
            !window.confirm("Tienes cambios sin guardar. ¿Quieres cancelar la edición?")
        ) {
            return;
        }
        onCancel();
    };

    const cambiar = (campo, valor) => {
        setForm((prev) => ({ ...prev, [campo]: valor }));
        setErrores((prev) => {
            if (!prev[campo]) return prev;
            const next = { ...prev };
            delete next[campo];
            return next;
        });
    };

    const alternarFaltante = (elemento) => {
        setForm((prev) => ({
            ...prev,
            elementos_faltantes: prev.elementos_faltantes.includes(elemento)
                ? prev.elementos_faltantes.filter((item) => item !== elemento)
                : [...prev.elementos_faltantes, elemento],
        }));
    };

    const enviar = async (event) => {
        event.preventDefault();
        const nextErrores = {};
        for (const campo of [
            "tipo_equipo",
            "numero_interno",
            "marca",
            "responsable",
        ]) {
            if (!form[campo].trim()) nextErrores[campo] = "Campo obligatorio";
        }

        for (const campo of ["horometro", "capacidad_kg", "anio"]) {
            if (form[campo] !== "" && !Number.isFinite(Number(form[campo]))) {
                nextErrores[campo] = "Ingresa un número válido";
            }
        }
        if (form.horometro !== "" && Number(form.horometro) < 0) {
            nextErrores.horometro = "No puede ser negativo";
        }
        if (form.capacidad_kg !== "" && Number(form.capacidad_kg) < 0) {
            nextErrores.capacidad_kg = "No puede ser negativa";
        }

        if (Object.keys(nextErrores).length > 0) {
            setErrores(nextErrores);
            refs.current[Object.keys(nextErrores)[0]]?.focus();
            return;
        }

        setGuardando(true);
        try {
            const actualizado = await onSubmit({
                id: equipo.id,
                ...form,
                tipo_equipo: form.tipo_equipo.trim(),
                numero_interno: form.numero_interno.trim(),
                numero_serie: form.numero_serie.trim(),
                marca: form.marca.trim(),
                modelo: form.modelo.trim(),
                ubicacion_actual: form.ubicacion_actual.trim(),
                horometro: form.horometro === "" ? null : Number(form.horometro),
                capacidad_kg:
                    form.capacidad_kg === "" ? null : Number(form.capacidad_kg),
                anio: form.anio === "" ? null : Number(form.anio),
                mastil: form.mastil.trim(),
                altura: form.altura.trim(),
                observaciones: form.observaciones.trim(),
                responsable: form.responsable.trim(),
            });
            if (actualizado) onSaved(actualizado);
        } finally {
            setGuardando(false);
        }
    };

    const campo = (nombre, etiqueta, opciones = {}) => (
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            {etiqueta}
            <input
                type={opciones.type ?? "text"}
                min={opciones.min}
                ref={(element) => {
                    refs.current[nombre] = element;
                }}
                aria-invalid={Boolean(errores[nombre])}
                value={form[nombre]}
                onChange={(event) => cambiar(nombre, event.target.value)}
                className={`${CLASES_INPUT_EDICION} ${
                    errores[nombre]
                        ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/15"
                        : ""
                }`}
            />
            {errores[nombre] && (
                <span className="mt-1 block text-xs font-medium text-rose-600 dark:text-rose-400">
                    {errores[nombre]}
                </span>
            )}
        </label>
    );

    return (
        <form
            onSubmit={enviar}
            className="animate-modal-contenido-in space-y-5"
            noValidate
        >
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 text-sm text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
                Corrige aquí los datos descriptivos y técnicos. El estado y la
                ubicación se modifican desde sus acciones para mantener el historial.
            </div>

            <section>
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                    Identificación
                </h3>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {campo("numero_interno", "N° interno")}
                    {campo("tipo_equipo", "Tipo de equipo")}
                    {campo("marca", "Marca")}
                    {campo("modelo", "Modelo")}
                    {campo("numero_serie", "N° de serie")}
                    {campo("ubicacion_actual", "Ubicación actual")}
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-neutral-400">
                    Bodega actual: <strong>{equipo.bodega || "En cliente"}</strong> ·
                    para moverlo usa “Mover equipo”.
                </p>
            </section>

            <section>
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                    Datos técnicos
                </h3>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {campo("capacidad_kg", "Capacidad (kg)", { type: "number", min: "0" })}
                    {campo("altura", "Altura de levante")}
                    {campo("mastil", "Mástil")}
                    {campo("anio", "Año", { type: "number" })}
                    {campo("horometro", "Horómetro", { type: "number", min: "0" })}
                </div>
                {usaBateriaElectrica(equipo) && (
                    <p className="mt-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-800 dark:border-cyan-500/25 dark:bg-cyan-500/10 dark:text-cyan-200">
                        La batería y su serie se actualizan desde “Control de batería” para mantener ambos historiales sincronizados.
                    </p>
                )}
            </section>

            <section>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                        Estado de información
                    </h3>
                    {form.elementos_faltantes.length > 0 && (
                        <button
                            type="button"
                            onClick={() => cambiar("elementos_faltantes", [])}
                            className="min-h-[44px] rounded-xl px-3 text-sm font-bold text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                        >
                            Limpiar faltantes
                        </button>
                    )}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                    Desmarca lo que ya tenga el equipo. Los datos antiguos también
                    aparecen aquí para que puedas corregirlos.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {opcionesFaltantes.map((elemento) => {
                        const esDatoAnterior =
                            !ELEMENTOS_FALTANTES.includes(elemento);
                        const seleccionado =
                            form.elementos_faltantes.includes(elemento);

                        return (
                            <label
                                key={elemento}
                                className={`flex min-h-[44px] min-w-0 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                                    esDatoAnterior
                                        ? "border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"
                                        : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.04]"
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={seleccionado}
                                    onChange={() => alternarFaltante(elemento)}
                                    className="h-4 w-4 shrink-0 accent-blue-600"
                                />
                                <span className="min-w-0 break-words text-slate-700 dark:text-slate-200">
                                    {elemento}
                                    {esDatoAnterior && (
                                        <span className="mt-0.5 block text-xs font-bold text-amber-700 dark:text-amber-300">
                                            Registro anterior
                                        </span>
                                    )}
                                </span>
                            </label>
                        );
                    })}
                </div>
                {form.elementos_faltantes.length === 0 && (
                    <p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">
                        Sin elementos faltantes.
                    </p>
                )}
                <label className="mt-3 block text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Observaciones
                    <textarea
                        rows={3}
                        value={form.observaciones}
                        onChange={(event) => cambiar("observaciones", event.target.value)}
                        className={`${CLASES_INPUT_EDICION} resize-y`}
                    />
                </label>
                {campo("responsable", "Responsable")}
            </section>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
                <button
                    type="button"
                    onClick={cancelar}
                    disabled={guardando}
                    className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={guardando}
                    className="min-h-[44px] rounded-xl bg-blue-600 px-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {guardando ? "Guardando…" : "Guardar cambios"}
                </button>
            </div>
        </form>
    );
}

function EquipoDetallePanel({
    equipo: equipoInicial,
    clientesById,
    onClose,
    onMover,
    onEstado,
    onHistorial,
    onBateria,
    onEliminar,
    onVerFoto,
    onGuardarEdicion,
}) {
    const [equipo, setEquipo] = useState(equipoInicial);
    const [editando, setEditando] = useState(false);
    const [cerrando, setCerrando] = useState(false);
    const dialogRef = useRef(null);
    const accionPendienteRef = useRef(null);
    const cierreCompletadoRef = useRef(false);
    const edicionSuciaRef = useRef(false);

    useEffect(() => {
        setEquipo(equipoInicial);
        setEditando(false);
        setCerrando(false);
        accionPendienteRef.current = null;
        cierreCompletadoRef.current = false;
    }, [equipoInicial]);

    useEffect(() => {
        const overflowAnterior = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = overflowAnterior;
        };
    }, []);

    const solicitarCierre = (accion = null) => {
        if (cerrando) return;
        if (
            editando &&
            edicionSuciaRef.current &&
            !window.confirm("Tienes cambios sin guardar. ¿Quieres cerrar la ficha igual?")
        ) {
            return;
        }
        accionPendienteRef.current = accion;
        setCerrando(true);
    };

    useDialogA11y(true, {
        dialogRef,
        onClose: solicitarCierre,
        bloquearCierre: cerrando,
    });

    const completarCierre = (event) => {
        if (
            !cerrando ||
            event.target !== event.currentTarget ||
            cierreCompletadoRef.current
        ) {
            return;
        }

        cierreCompletadoRef.current = true;
        const accionPendiente = accionPendienteRef.current;
        onClose();
        accionPendiente?.();
    };

    const ubicacion = equipo.cliente_id
        ? clientesById.get(equipo.cliente_id)?.razon_social ??
          `Cliente #${equipo.cliente_id}`
        : equipo.bodega || equipo.ubicacion_actual || "Sin ubicación";
    const faltantes = parseFaltantes(equipo.elementos_faltantes);
    const ultimo = equipo.ultimo_movimiento;
    const bateriaAsociada = equipo.bateria_asociada ?? null;
    const identificadorBateriaLegacy = tieneIdentificadorBateriaLegacy(equipo);

    const datosTecnicos = [
        ["Capacidad", formatearCapacidad(equipo.capacidad_kg)],
        ["Altura de levante", mostrarDato(equipo.altura)],
        ["Serie", mostrarDato(equipo.numero_serie)],
        ["Mástil", mostrarDato(equipo.mastil)],
        ["Año", mostrarDato(equipo.anio)],
        ["Horómetro", mostrarDato(equipo.horometro)],
    ];

    return (
        <div
            className={`fixed inset-0 z-50 bg-slate-950/40 ${
                cerrando
                    ? "pointer-events-none animate-equipo-detalle-fondo-out"
                    : "animate-equipo-detalle-fondo-in"
            }`}
            role="presentation"
            onClick={() => solicitarCierre()}
        >
            <aside
                ref={dialogRef}
                className={`absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl will-change-transform dark:bg-carbon-950 ${
                    cerrando
                        ? "animate-equipo-detalle-panel-out"
                        : "animate-equipo-detalle-panel-in"
                }`}
                role="dialog"
                aria-modal="true"
                aria-label={`Ficha del equipo ${equipo.numero_interno ?? ""}`}
                tabIndex={-1}
                onClick={(event) => event.stopPropagation()}
                onAnimationEnd={completarCierre}
            >
                <header
                    className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 pb-3 backdrop-blur sm:px-6 dark:border-white/10 dark:bg-carbon-950/95"
                    style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
                >
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">
                            Ficha del equipo
                        </p>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
                            ID ingreso {String(equipo.correlativo ?? "—").padStart(4, "0")}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setEditando(true)}
                            disabled={!onGuardarEdicion}
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-xl text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                            aria-label="Editar datos del equipo"
                            title="Editar datos del equipo"
                        >
                            ✎
                        </button>
                        <button
                            type="button"
                            onClick={() => solicitarCierre()}
                            data-dialog-autofocus
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-xl text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
                            aria-label="Cerrar ficha"
                        >
                            ×
                        </button>
                    </div>
                </header>

                <div className="space-y-5 p-4 sm:p-6">
                    {editando ? (
                        <EquipoEdicionForm
                            equipo={equipo}
                            onCancel={() => setEditando(false)}
                            onSaved={(actualizado) => {
                                setEquipo(actualizado);
                                setEditando(false);
                            }}
                            onSubmit={onGuardarEdicion}
                            onDirtyChange={(sucia) => {
                                edicionSuciaRef.current = sucia;
                            }}
                        />
                    ) : (
                        <>
                    <section className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => onVerFoto(equipo.foto_url || null)}
                            className="shrink-0 cursor-zoom-in rounded-xl transition hover:opacity-85"
                            aria-label="Ver foto del equipo"
                        >
                            <EquipoFoto path={equipo.foto_url || null} size="md" />
                        </button>
                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-neutral-400">
                                N° interno
                            </p>
                            <p className="mt-1 font-mono text-4xl font-black leading-none tracking-tight text-slate-950 dark:text-white">
                                {mostrarDato(equipo.numero_interno)}
                            </p>
                            <p className="mt-2 text-lg font-extrabold text-slate-800 dark:text-slate-100">
                                {mostrarDato(equipo.tipo_equipo)}
                            </p>
                            <p className="text-sm font-semibold text-slate-600 dark:text-neutral-300">
                                {mostrarDato(equipo.marca)} {equipo.modelo || ""}
                            </p>
                        </div>
                    </section>

                    <div className="flex flex-wrap gap-1.5">
                        <EstadoBadge estado={equipo.estado_operacional} />
                        <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800 dark:bg-sky-500/10 dark:text-sky-400">
                            {equipo.cliente_id ? "🏢" : "📍"} {ubicacion}
                        </span>
                        <RetornoClientePendiente
                            equipo={equipo}
                            clientesById={clientesById}
                        />
                        {equipo.vendido && (
                            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-bold text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400">
                                💰 Vendido
                            </span>
                        )}
                    </div>

                    <section>
                        <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                            Datos técnicos
                        </h3>
                        <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {datosTecnicos.map(([label, valor]) => (
                                <div
                                    key={label}
                                    className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-white/5 dark:bg-white/[0.04]"
                                >
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                                        {label}
                                    </dt>
                                    <dd className="mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {valor}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </section>

                    {usaBateriaElectrica(equipo) && (
                        <section>
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                                    Batería actual
                                </h3>
                                <button
                                    type="button"
                                    onClick={() =>
                                        solicitarCierre(() => onBateria(equipo))
                                    }
                                    className="min-h-[44px] rounded-xl border border-cyan-200 bg-cyan-50 px-3 text-xs font-bold text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-cyan-500/20"
                                >
                                    🔋 Gestionar
                                </button>
                            </div>
                            {bateriaAsociada ? (
                                <div className="mt-2 rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4 dark:border-cyan-500/25 dark:bg-cyan-500/10">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                                        N° interno batería
                                    </p>
                                    <p className="mt-1 font-mono text-2xl font-black text-cyan-950 dark:text-cyan-100">
                                        {bateriaAsociada.numero_interno || "—"}
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-cyan-800 dark:text-cyan-200">
                                        Serie: {bateriaAsociada.numero_serie || "—"}
                                    </p>
                                    <p className="mt-2 text-xs text-cyan-700 dark:text-cyan-300">
                                        Esta información se actualiza automáticamente al asociar o cambiar la batería.
                                    </p>
                                </div>
                            ) : equipo.bateria || equipo.bateria_serie ? (
                                <div className="mt-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                                    <p className="text-xs font-bold uppercase tracking-wide">
                                        {identificadorBateriaLegacy
                                            ? "Dato antiguo pendiente de asociar"
                                            : "Dato antiguo sin batería identificada"}
                                    </p>
                                    <p className="mt-1 font-mono text-xl font-black">
                                        {equipo.bateria || "—"}
                                    </p>
                                    <p className="mt-1 text-sm font-semibold">
                                        Serie: {equipo.bateria_serie || "—"}
                                    </p>
                                    <p className="mt-2 text-xs">
                                        {identificadorBateriaLegacy
                                            ? "Este dato venía de la planilla, pero todavía no corresponde a una batería registrada en el inventario nuevo."
                                            : "La planilla indicaba que el equipo no tenía una batería identificada. Puedes asociar una cuando corresponda."}
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-2 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                                    Este equipo todavía no tiene una batería registrada asociada.
                                </div>
                            )}
                        </section>
                    )}

                    {ultimo && (
                        <section>
                            <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                                Último movimiento
                            </h3>
                            <div className="mt-2 rounded-2xl border border-violet-200 bg-violet-50/70 p-3.5 dark:border-violet-500/20 dark:bg-violet-500/10">
                                <p className="font-bold text-violet-900 dark:text-violet-200">
                                    {ultimo.motivo}
                                </p>
                                <p className="mt-1 text-sm text-violet-800 dark:text-violet-300">
                                    → {ultimo.bodega_destino ??
                                        clientesById.get(ultimo.cliente_destino_id)
                                            ?.razon_social ??
                                        ultimo.destino_externo ??
                                        "—"}
                                </p>
                                <p className="mt-1 text-xs text-violet-700 dark:text-violet-300/80">
                                    {formatearFechaCorta(ultimo.fecha)} · 👤 {ultimo.responsable}
                                </p>
                            </div>
                        </section>
                    )}

                    {faltantes.length > 0 && (
                        <section className="rounded-2xl border border-red-200 bg-red-50 p-3.5 dark:border-red-500/20 dark:bg-red-500/10">
                            <h3 className="text-sm font-bold text-red-800 dark:text-red-300">
                                ⚠ Elementos faltantes
                            </h3>
                            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                                {faltantes.join(", ")}
                            </p>
                        </section>
                    )}

                    {equipo.observaciones && (
                        <section>
                            <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                                Observaciones
                            </h3>
                            <p className="mt-2 rounded-2xl bg-slate-50 p-3.5 text-sm text-slate-700 dark:bg-white/[0.04] dark:text-slate-200">
                                {equipo.observaciones}
                            </p>
                        </section>
                    )}
                        </>
                    )}
                </div>

                {!editando && <footer className="sticky bottom-0 mt-auto grid grid-cols-2 gap-2 border-t border-slate-200 bg-white/95 p-4 backdrop-blur sm:flex dark:border-white/10 dark:bg-carbon-950/95">
                    <button
                        type="button"
                        onClick={() =>
                            solicitarCierre(() => onMover(equipo))
                        }
                        className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                    >
                        {equipo.cliente_retorno_id
                            ? "↩️ Resolver reparación"
                            : "🔄 Mover equipo"}
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            solicitarCierre(() => onEstado(equipo))
                        }
                        className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                    >
                        🛠 Estado
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            solicitarCierre(() => onHistorial(equipo))
                        }
                        className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 text-sm font-bold text-violet-700 transition hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400 dark:hover:bg-violet-500/20"
                    >
                        📜 Historial
                    </button>
                    {usaBateriaElectrica(equipo) && (
                        <button
                            type="button"
                            onClick={() =>
                                solicitarCierre(() => onBateria(equipo))
                            }
                            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 px-3 text-sm font-bold text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-400 dark:hover:bg-cyan-500/20"
                        >
                            🔋 Batería
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() =>
                            solicitarCierre(() => onEliminar(equipo))
                        }
                        className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-700 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                    >
                        🗑 Eliminar
                    </button>
                </footer>}
            </aside>
        </div>
    );
}
