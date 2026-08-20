import { useEffect, useMemo, useRef, useState } from "react";
import {
    BODEGAS,
    CATEGORIAS_SWAP,
    MOTIVOS_MOVIMIENTO,
    MOTIVOS_TILES,
    MOTIVO_POR_CATEGORIA_SWAP,
    camposPorMotivo,
    esSwap,
    esVenta,
    requiereDocumentosMovimiento,
} from "../../lib/equiposConstants";
import { supabase } from "../../services/supabase";
import { useNetwork } from "../../context/NetworkContext";
import {
    useModalTransition,
    useRetainedValue,
} from "../../hooks/useModalTransition";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { useResponsableSesion } from "../../hooks/useResponsableSesion";
import EquipoFoto from "./EquipoFoto";
import PhotoUpload from "./PhotoUpload";

const clasesInput =
    "mt-1 block w-full rounded-[10px] border-[1.5px] border-slate-300 bg-white px-3 py-2.5 text-base font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-100 dark:placeholder-neutral-500";

const estadoInicial = {
    motivo: "",
    bodega_destino: "",
    ubicacion_destino: "",
    ubicacion_retorno: "",
    cliente_id: "",
    categoria: "",
    equipo_recibe_id: "",
    bodega_recibe_destino: "",
    destino_externo: "",
    horometro: "",
    horometro_recibe: "",
    numero_acta: "",
    numero_guia_despacho: "",
    responsable: "",
    notas: "",
};

function documentoEsValido(valor) {
    const documento = String(valor ?? "").trim();
    if (!documento) return false;

    // Acta y guía se registran únicamente como números. Se mantiene la
    // validación de mayor que cero para evitar folios inválidos.
    return /^\d+$/.test(documento) && Number(documento) > 0;
}

function normalizarHorometro(valor) {
    return String(valor ?? "")
        .replace(",", ".")
        .replace(/[^\d.]/g, "");
}

function horometroEsValido(valor, actual) {
    const texto = String(valor ?? "").trim();
    if (!/^\d+(\.\d+)?$/.test(texto)) return false;

    const numero = Number(texto);
    if (!Number.isFinite(numero) || numero < 0) return false;

    return actual === null || actual === undefined || numero >= Number(actual);
}

function normalizarTextoBusqueda(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

/**
 * Diálogo controlado para registrar un movimiento de equipo.
 *
 * Props:
 *  - open: boolean
 *  - equipo: { id, marca, modelo, numero_interno, bodega, cliente_id,
 *              cliente_nombre?, ubicacion_actual, foto_url, correlativo }
 *  - clientes: [{ id, razon_social }] — catálogo para el dropdown
 *  - onSubmit(payload): async — para movimientos simples (offline-capable).
 *      payload: { equipo_id, bodega_origen, bodega_destino, cliente_origen_id,
 *                 cliente_destino_id, ubicacion_origen, ubicacion_destino,
 *                 motivo, responsable, notas, categoria, destino_externo,
 *                 fotoFile?, oldFotoUrl? }
 *  - onSubmitSwap(payload): async — para cambios de equipo bidireccionales.
 *      payload: { equipo_id, bodega_origen, bodega_destino,
 *                 cliente_origen_id, cliente_destino_id, motivo, responsable,
 *                 notas, categoria,
 *                 equipo_recibe_id, bodega_recibe_destino,
 *                 fotoFile?, oldFotoUrl? }
 *  - onCrearCliente(): void — abre el modal hermano para crear un
 *      cliente nuevo (botón "+ Nuevo" junto al dropdown de cliente).
 *      El padre es responsable de manejar el modal CrearClienteForm.
 *  - onCancel(): void
 *
 * El form es dinámico: los campos mostrados dependen del motivo elegido.
 * El padre (InventarioView) decide si enrutar a onSubmit u onSubmitSwap.
 *
 * El equipo_origen es implícito: viene del prop `equipo`. El usuario
 * no elige qué equipo se mueve (es el que disparó el dialog).
 *
 * El dialog NO toca Storage directamente. Si el usuario adjunta una
 * foto nueva, se pasa en `payload.fotoFile` y el padre la sube con
 * `uploadFotoEquipo` (borrando la anterior solo si el RPC confirma).
 */
export default function MovimientoDialog({
    open,
    equipo: equipoProp,
    clientes = [],
    onSubmit,
    onSubmitSwap,
    onCrearCliente,
    onCancel,
}) {
    const refs = useRef({});
    const dialogRef = useRef(null);
    const { online } = useNetwork();
    const responsableSesion = useResponsableSesion();
    const transicion = useModalTransition(open);
    const equipo = useRetainedValue(
        equipoProp,
        open && Boolean(equipoProp),
    );
    const origenCliente = Boolean(equipo?.cliente_id && !equipo?.bodega);
    const equipoEnCliente = origenCliente;
    const equipoEnMantencion = Boolean(equipo?.cliente_retorno_id);
    const [form, setForm] = useState(estadoInicial);
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(false);
    const [fotoFile, setFotoFile] = useState(null);
    const [fotoError, setFotoError] = useState(null);
    const [equiposParaSwap, setEquiposParaSwap] = useState([]);
    const [cargandoEquiposCliente, setCargandoEquiposCliente] = useState(false);
    const [versionFormulario, setVersionFormulario] = useState(0);

    useUnsavedChanges([form, Boolean(fotoFile)], {
        habilitado: open && !guardando,
        resetKey: versionFormulario,
    });

    // Reset al abrir
    useEffect(() => {
        if (open) {
            setForm({
                ...estadoInicial,
                responsable: responsableSesion,
                horometro:
                    equipo?.horometro === null ||
                    equipo?.horometro === undefined
                        ? ""
                        : String(equipo.horometro),
            });
            setErrores({});
            setGuardando(false);
            setFotoFile(null);
            setFotoError(null);
            setEquiposParaSwap([]);
            setVersionFormulario((version) => version + 1);
        }
    }, [open, equipo, responsableSesion]);

    useDialogA11y(open, {
        dialogRef,
        onClose: onCancel,
        bloquearCierre: guardando,
    });

    // Carga lazy de candidatos para el intercambio. Si el movimiento parte
    // desde bodega, busca el equipo que volverá desde el cliente. Si se abre
    // desde un equipo en cliente, busca su reemplazante disponible en bodega.
    useEffect(() => {
        if (!open) return;
        if (!esSwap(form.motivo)) {
            setEquiposParaSwap([]);
            return;
        }
        if (!equipoEnCliente && !form.cliente_id) {
            setEquiposParaSwap([]);
            return;
        }
        let cancelado = false;
        const cargar = async () => {
            setCargandoEquiposCliente(true);
            try {
                let query = supabase
                    .from("equipos")
                    .select(
                        "id, correlativo, tipo_equipo, marca, modelo, numero_interno, numero_serie, bodega, cliente_id, cliente_retorno_id, estado_operacional, horometro, vendido",
                    )
                    .is("deleted_at", null);

                query = equipoEnCliente
                    ? query
                          .not("bodega", "is", null)
                          .is("cliente_id", null)
                          .is("cliente_retorno_id", null)
                          .or("vendido.eq.false,vendido.is.null")
                    : query.eq("cliente_id", form.cliente_id);

                const { data, error } = await query.order("correlativo");
                if (error) throw error;
                if (cancelado) return;
                setEquiposParaSwap(data ?? []);
            } catch {
                if (!cancelado) setEquiposParaSwap([]);
            } finally {
                if (!cancelado) setCargandoEquiposCliente(false);
            }
        };
        cargar();
        return () => {
            cancelado = true;
        };
    }, [open, form.motivo, form.cliente_id, equipoEnCliente]);

    if (!transicion.renderizar || !equipo) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        const valorNormalizado =
            name === "numero_acta" || name === "numero_guia_despacho"
                ? value.replace(/\D/g, "")
                : name === "horometro" || name === "horometro_recibe"
                  ? normalizarHorometro(value)
                  : value;
        setForm((prev) => ({ ...prev, [name]: valorNormalizado }));
        // Si cambia motivo o cliente_id, limpiar campos derivados
        if (name === "motivo") {
            const swapDesdeCliente = equipoEnCliente && esSwap(value);
            const retornoAlCliente =
                equipoEnMantencion && value === "Retorno a cliente";
            setForm((prev) => ({
                ...prev,
                bodega_destino: "",
                cliente_id: retornoAlCliente
                    ? String(equipo.cliente_retorno_id)
                    : swapDesdeCliente
                      ? String(equipo.cliente_id)
                      : "",
                categoria: "",
                equipo_recibe_id: "",
                bodega_recibe_destino: "",
                destino_externo: "",
                ubicacion_destino: retornoAlCliente
                    ? equipo.ubicacion_retorno_cliente || ""
                    : swapDesdeCliente
                      ? equipo.ubicacion_actual || ""
                      : "",
                ubicacion_retorno: "",
                numero_acta: "",
                numero_guia_despacho: "",
            }));
            setEquiposParaSwap([]);
        } else if (name === "cliente_id") {
            setForm((prev) => ({
                ...prev,
                equipo_recibe_id: "",
                horometro_recibe: "",
            }));
        } else if (name === "equipo_recibe_id") {
            const equipoRecibe = equiposParaSwap.find(
                (item) => String(item.id) === String(value),
            );
            setForm((prev) => ({
                ...prev,
                horometro_recibe:
                    equipoRecibe?.horometro === null ||
                    equipoRecibe?.horometro === undefined
                        ? ""
                        : String(equipoRecibe.horometro),
            }));
        }
        // En swaps, la categoría determina el motivo exacto que se guarda
        // (renovacion → "Cambio de equipo (renovación)", etc.)
        if (name === "categoria" && MOTIVO_POR_CATEGORIA_SWAP[value]) {
            setForm((prev) =>
                esSwap(prev.motivo)
                    ? { ...prev, motivo: MOTIVO_POR_CATEGORIA_SWAP[value] }
                    : prev,
            );
        }
        if (errores[name]) {
            setErrores((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const validar = () => {
        const errs = {};
        if (!form.motivo) errs.motivo = "Selecciona un motivo";
        if (!MOTIVOS_MOVIMIENTO.includes(form.motivo))
            errs.motivo = "Motivo no válido";
        if (
            equipoEnMantencion &&
            ![
                "Retorno a cliente",
                "Cierre de mantención en bodega",
            ].includes(form.motivo)
        ) {
            errs.motivo =
                "Selecciona si el equipo vuelve al cliente o queda en una bodega";
        }
        if (
            form.motivo === "Retorno a cliente" &&
            String(form.cliente_id) !== String(equipo.cliente_retorno_id)
        ) {
            errs.motivo = "El cliente de retorno no corresponde a esta mantención";
        }
        if (!form.responsable.trim()) errs.responsable = "Indica quién registra";

        const { requiere } = camposPorMotivo(form.motivo);

        if (requiere.includes("bodega_destino") && !form.bodega_destino)
            errs.bodega_destino = "Selecciona una bodega";
        if (requiere.includes("cliente_id") && !form.cliente_id)
            errs.cliente_id = "Selecciona un cliente";
        if (requiere.includes("categoria") && !form.categoria)
            errs.categoria = "Selecciona la categoría";
        if (requiere.includes("equipo_recibe_id") && !form.equipo_recibe_id)
            errs.equipo_recibe_id = "Selecciona el equipo que recibes";
        if (
            requiere.includes("bodega_recibe_destino") &&
            !form.bodega_recibe_destino
        )
            errs.bodega_recibe_destino = "Selecciona la bodega destino";
        if (
            requiere.includes("destino_externo") &&
            !form.destino_externo.trim()
        )
            errs.destino_externo = "Indica el destino externo";
        if (requiere.includes("notas") && !form.notas.trim())
            errs.notas = "Cuéntanos el motivo";
        if (requiereDocumentosMovimiento(form.motivo)) {
            const tieneActa = documentoEsValido(form.numero_acta);
            const tieneGuia = documentoEsValido(form.numero_guia_despacho);
            const ingresoActa = form.numero_acta.trim();
            const ingresoGuia = form.numero_guia_despacho.trim();

            if (ingresoActa && !tieneActa) {
                errs.numero_acta = "Ingresa solo números mayores que cero";
            }
            if (ingresoGuia && !tieneGuia) {
                errs.numero_guia_despacho = "Ingresa solo números mayores que cero";
            }
            if (!tieneActa && !tieneGuia && !ingresoActa && !ingresoGuia) {
                errs.numero_acta =
                    "Ingresa al menos el acta o la guía de despacho";
            }
        }

        if (!horometroEsValido(form.horometro, equipo.horometro)) {
            errs.horometro =
                form.horometro.trim() === ""
                    ? "Ingresa el horómetro actualizado"
                    : equipo.horometro !== null && equipo.horometro !== undefined
                      ? `Debe ser igual o mayor al actual (${equipo.horometro} h)`
                      : "Ingresa un número de horómetro válido (igual o mayor que 0)";
        }

        if (esSwap(form.motivo) && form.equipo_recibe_id) {
            const equipoRecibe = equiposParaSwap.find(
                (item) => String(item.id) === String(form.equipo_recibe_id),
            );
            if (
                !horometroEsValido(
                    form.horometro_recibe,
                    equipoRecibe?.horometro,
                )
            ) {
                errs.horometro_recibe =
                    form.horometro_recibe.trim() === ""
                        ? "Ingresa el horómetro actualizado de este equipo"
                        : equipoRecibe?.horometro !== null &&
                            equipoRecibe?.horometro !== undefined
                          ? `Debe ser igual o mayor al actual (${equipoRecibe.horometro} h)`
                          : "Ingresa un número de horómetro válido (igual o mayor que 0)";
            }
        }

        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validar();
        if (Object.keys(errs).length > 0) {
            setErrores(errs);
            const primerCampo = Object.keys(errs)[0];
            refs.current[primerCampo]?.focus();
            return;
        }

        // Validación adicional: swap requiere conexión
        if (esSwap(form.motivo) && !online) {
            setErrores({
                motivo:
                    "Los cambios de equipo requieren conexión. Espera a tener red.",
            });
            return;
        }

        setGuardando(true);
        try {
            const base = {
                equipo_id: equipo.id,
                bodega_origen: equipo.bodega ?? null,
                bodega_destino: form.bodega_destino || null,
                cliente_origen_id: equipo.cliente_id ?? null,
                cliente_destino_id: form.cliente_id
                    ? Number(form.cliente_id)
                    : null,
                ubicacion_origen: equipo.ubicacion_actual ?? null,
                ubicacion_destino: form.ubicacion_destino.trim() || null,
                ubicacion_retorno: form.ubicacion_retorno.trim() || null,
                motivo: form.motivo,
                responsable: form.responsable.trim(),
                notas: form.notas.trim() || null,
                horometro: Number(form.horometro),
                horometro_recibe: form.horometro_recibe
                    ? Number(form.horometro_recibe)
                    : null,
                numero_acta: form.numero_acta.trim() || null,
                numero_guia_despacho: form.numero_guia_despacho.trim() || null,
                categoria: form.categoria || null,
                destino_externo: form.destino_externo.trim() || null,
                fotoFile: fotoFile || null,
                oldFotoUrl: fotoFile ? equipo.foto_url || null : null,
            };

            if (esSwap(form.motivo)) {
                await onSubmitSwap({
                    ...base,
                    equipo_recibe_id: Number(form.equipo_recibe_id),
                    bodega_recibe_destino: form.bodega_recibe_destino,
                });
            } else {
                await onSubmit(base);
            }
        } finally {
            setGuardando(false);
        }
    };

    const motivosVisibles = equipoEnMantencion
        ? MOTIVOS_TILES.filter((tile) => tile.esCierreMantencion)
        : equipoEnCliente
          ? MOTIVOS_TILES.filter(
                (tile) =>
                    tile.motivo === "Mantención interna" ||
                    tile.motivo === "Devolución definitiva" ||
                    tile.esSwapTile,
            )
          : MOTIVOS_TILES.filter(
                (tile) =>
                    tile.motivo !== "Mantención interna" &&
                    tile.motivo !== "Devolución definitiva" &&
                    !tile.esCierreMantencion,
            );
    const swapRequiereRed = esSwap(form.motivo) && !online;
    const equipoRecibeSeleccionado = equiposParaSwap.find(
        (item) => String(item.id) === String(form.equipo_recibe_id),
    );
    // Nombre del cliente comprador, para el aviso de equipo vendido.
    const nombreClienteVendido = equipo.vendido
        ? (clientes.find(
              (c) => c.id === (equipo.cliente_id ?? equipo.cliente_retorno_id),
          )?.razon_social ??
          null)
        : null;
    const clienteRetorno = clientes.find(
        (cliente) =>
            String(cliente.id) === String(equipo.cliente_retorno_id),
    );
    return (
        <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="movimiento-titulo"
            aria-busy={guardando}
            tabIndex={-1}
            className={`fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4 ${transicion.claseFondo}`}
            onClick={(e) => {
                if (e.target === e.currentTarget && !guardando) onCancel();
            }}
        >
            <div
                className={`flex max-h-[calc(100dvh-0.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[24px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:max-h-[min(92dvh,860px)] sm:rounded-[24px] dark:border-white/10 dark:bg-carbon-900 ${transicion.clasePanel}`}
            >
                <header
                    className="relative flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 pb-4 pt-5 sm:px-6 dark:border-white/10 dark:bg-carbon-900"
                    style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
                >
                    <span
                        className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-slate-300 sm:hidden dark:bg-white/20"
                        aria-hidden="true"
                    />
                    <div className="flex min-w-0 items-start gap-3">
                        <span
                            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-700 sm:flex dark:bg-blue-500/10 dark:text-blue-300"
                            aria-hidden="true"
                        >
                            ↔
                        </span>
                        <div className="min-w-0">
                        <h2
                            id="movimiento-titulo"
                            className="text-lg font-black text-slate-950 dark:text-white"
                        >
                            Registrar movimiento
                        </h2>
                        <p className="mt-1 truncate text-sm text-slate-600 dark:text-neutral-400">
                            {equipo.marca} {equipo.modelo} ·{" "}
                            <span className="font-mono font-semibold">
                                {equipo.numero_interno}
                            </span>
                        </p>
                        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-neutral-400">
                            <span>Origen:</span>
                            {origenCliente ? (
                                <span className="rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-800 dark:bg-sky-500/10 dark:text-sky-300">
                                    🏢 En cliente
                                </span>
                            ) : (
                                <strong className="text-slate-700 dark:text-slate-200">
                                    {equipo.bodega}
                                </strong>
                            )}
                            {equipo.ubicacion_actual && (
                                <span className="truncate italic">
                                    · {equipo.ubicacion_actual}
                                </span>
                            )}
                        </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={guardando}
                        data-dialog-autofocus
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label="Cerrar registro de movimiento"
                    >
                        ×
                    </button>
                </header>

                <form
                    onSubmit={handleSubmit}
                    className="flex min-h-0 flex-1 flex-col"
                    noValidate
                >
                    <div className="dialog-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">

                {/* Aviso de equipo vendido: los movimientos siguen
                    permitidos (ej. mantención), solo es informativo */}
                {equipo.vendido && (
                    <div className="mb-4 rounded-[10px] border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-[0.8rem] text-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
                        💰 <strong>Equipo vendido</strong>
                        {nombreClienteVendido
                            ? ` a ${nombreClienteVendido}`
                            : ""}
                        . Los movimientos siguen permitidos (ej. mantención);
                        deja el detalle en las notas.
                    </div>
                )}

                {equipoEnMantencion && (
                    <div className="mb-4 rounded-[10px] border-l-4 border-violet-500 bg-violet-50 px-3 py-2.5 text-sm text-violet-950 dark:bg-violet-500/10 dark:text-violet-200">
                        <p className="font-extrabold">
                            🛠️ Reparación proveniente de cliente
                        </p>
                        <p className="mt-1 text-xs">
                            Debe volver a{" "}
                            <strong>
                                {clienteRetorno?.razon_social ??
                                    `Cliente #${equipo.cliente_retorno_id}`}
                            </strong>{" "}
                            o cerrar su permanencia en una bodega Licman.
                        </p>
                    </div>
                )}

                {equipo.bateria_asociada && (
                    <div className="mb-4 rounded-[10px] border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-sm text-cyan-900 dark:border-cyan-500/25 dark:bg-cyan-500/10 dark:text-cyan-100">
                        <p className="font-bold">
                            🔋 Batería asociada: {equipo.bateria_asociada.numero_interno}
                        </p>
                        <p className="mt-0.5 text-xs text-cyan-800 dark:text-cyan-200">
                            Serie {equipo.bateria_asociada.numero_serie}. Al guardar, este traslado quedará registrado automáticamente en el historial del equipo y de la batería.
                        </p>
                    </div>
                )}

                {/* Foto actual del equipo — solo referencia visual */}
                <section className="mb-4 flex items-start gap-3 rounded-[10px] border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                    <EquipoFoto
                        path={equipo.foto_url || null}
                        size="sm"
                        alt="Foto actual del equipo"
                    />
                    <div className="min-w-0 flex-1">
                        <p className="text-[0.78rem] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                            Foto actual
                        </p>
                        {equipo.foto_url ? (
                            <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-neutral-400">
                                {equipo.foto_url}
                            </p>
                        ) : (
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                                Este equipo aún no tiene foto.
                            </p>
                        )}
                    </div>
                </section>

                <div className="space-y-4">
                    {/* Motivo — grilla de tiles grandes (touch-friendly) */}
                    <div>
                        <p className="text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                            Motivo
                        </p>
                        {equipoEnCliente && (
                            <p className="mt-1 text-xs text-slate-600 dark:text-neutral-400">
                                Este equipo está en cliente. Puedes cambiarlo
                                por otro equipo disponible, ingresarlo a una
                                bodega para mantención interna o registrar su
                                devolución definitiva.
                            </p>
                        )}
                        {equipoEnMantencion && (
                            <p className="mt-1 text-xs text-slate-600 dark:text-neutral-400">
                                La reparación tiene un cliente de retorno
                                asociado. Elige cómo cerrar este ciclo.
                            </p>
                        )}
                        <div
                            role="radiogroup"
                            aria-label="Motivo del movimiento"
                            className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3"
                        >
                            {motivosVisibles.map((tile) => {
                                const seleccionado = tile.esSwapTile
                                    ? esSwap(form.motivo)
                                    : form.motivo === tile.motivo;
                                return (
                                    <button
                                        key={tile.label}
                                        type="button"
                                        role="radio"
                                        aria-checked={seleccionado}
                                        onClick={() =>
                                            handleChange({
                                                target: {
                                                    name: "motivo",
                                                    value: tile.motivo,
                                                },
                                            })
                                        }
                                        className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-[10px] border-[1.5px] px-2 py-2 text-center transition active:scale-[0.97] ${
                                            seleccionado
                                                ? "border-blue-600 bg-blue-50 text-blue-800 shadow-[0_0_0_3px_rgba(37,99,235,0.15)] dark:bg-blue-500/15 dark:text-blue-300"
                                                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200 dark:hover:bg-white/10"
                                        }`}
                                    >
                                        <span className="text-xl leading-none">
                                            {tile.icono}
                                        </span>
                                        <span className="text-[0.8rem] font-bold leading-tight">
                                            {tile.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {errores.motivo && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errores.motivo}
                            </p>
                        )}
                    </div>

                    {/* Campos dinámicos según motivo */}
                    <CamposPorMotivo
                        form={form}
                        errores={errores}
                        refs={refs}
                        clasesInput={clasesInput}
                        onChange={handleChange}
                        clientes={clientes}
                        equiposParaSwap={equiposParaSwap}
                        cargandoEquiposCliente={cargandoEquiposCliente}
                        onCrearCliente={onCrearCliente}
                        equipoEnCliente={equipoEnCliente}
                        equipoEnMantencion={equipoEnMantencion}
                        bodegaOrigen={equipo.bodega}
                        clienteActual={clientes.find(
                            (cliente) =>
                                String(cliente.id) ===
                                String(equipo.cliente_id),
                        )}
                        clienteRetorno={clienteRetorno}
                    />

                    {/* Horómetro: obligatorio para todo movimiento */}
                    <section className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 dark:border-blue-500/25 dark:bg-blue-500/10">
                        <h3 className="text-sm font-extrabold text-blue-900 dark:text-blue-200">
                            Horómetro del movimiento
                        </h3>
                        <p className="mt-1 text-xs text-blue-800 dark:text-blue-300">
                            Registra la lectura actual antes de guardar. No puede
                            ser menor que la última registrada.
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {esSwap(form.motivo) && equipoEnCliente
                                    ? "Equipo que vuelve a bodega"
                                    : "Equipo que sale"}
                                <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-neutral-400">
                                    Actual: {equipo.horometro ?? "sin registro"} h
                                </span>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    step="any"
                                    name="horometro"
                                    value={form.horometro}
                                    onChange={handleChange}
                                    ref={(el) => {
                                        refs.current.horometro = el;
                                    }}
                                    placeholder="Ej. 1250.5"
                                    className={clasesInput}
                                />
                                {errores.horometro && (
                                    <p className="mt-1 text-xs font-medium text-rose-600">
                                        {errores.horometro}
                                    </p>
                                )}
                            </label>

                            {esSwap(form.motivo) && equipoRecibeSeleccionado && (
                                <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {equipoEnCliente
                                        ? "Equipo reemplazante"
                                        : "Equipo que vuelve a bodega"}
                                    <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-neutral-400">
                                        Actual: {equipoRecibeSeleccionado.horometro ?? "sin registro"} h
                                    </span>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="any"
                                        name="horometro_recibe"
                                        value={form.horometro_recibe}
                                        onChange={handleChange}
                                        ref={(el) => {
                                            refs.current.horometro_recibe = el;
                                        }}
                                        placeholder="Ej. 980.2"
                                        className={clasesInput}
                                    />
                                    {errores.horometro_recibe && (
                                        <p className="mt-1 text-xs font-medium text-rose-600">
                                            {errores.horometro_recibe}
                                        </p>
                                    )}
                                </label>
                            )}
                        </div>
                    </section>

                    {requiereDocumentosMovimiento(form.motivo) && (
                        <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-500/25 dark:bg-amber-500/10">
                            <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-200">
                                Documentos del movimiento
                            </h3>
                            <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
                                Ingresa al menos uno: acta o guía de despacho.
                                Si tienes ambos, registra los dos.
                            </p>
                            <div className="mt-3 grid items-start gap-3 sm:grid-cols-2">
                                <label className="block min-w-0 text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                                    <span className="block">N° de acta</span>
                                    <span className="mt-0.5 block min-h-5 text-xs font-normal leading-5 text-slate-500 dark:text-neutral-400">
                                        Opcional si ingresas la guía
                                    </span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        name="numero_acta"
                                        value={form.numero_acta}
                                        onChange={handleChange}
                                        ref={(el) => {
                                            refs.current.numero_acta = el;
                                        }}
                                        placeholder="Ej. 123456"
                                        className={clasesInput}
                                    />
                                    {errores.numero_acta && (
                                        <p className="mt-1 text-xs font-medium text-rose-600">
                                            {errores.numero_acta}
                                        </p>
                                    )}
                                </label>
                                <label className="block min-w-0 text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                                    <span className="block">N° guía de despacho</span>
                                    <span className="mt-0.5 block min-h-5 text-xs font-normal leading-5 text-slate-500 dark:text-neutral-400">
                                        Opcional si ingresas el acta
                                    </span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        name="numero_guia_despacho"
                                        value={form.numero_guia_despacho}
                                        onChange={handleChange}
                                        ref={(el) => {
                                            refs.current.numero_guia_despacho = el;
                                        }}
                                        placeholder="Ej. 000123"
                                        className={clasesInput}
                                    />
                                    {errores.numero_guia_despacho && (
                                        <p className="mt-1 text-xs font-medium text-rose-600">
                                            {errores.numero_guia_despacho}
                                        </p>
                                    )}
                                </label>
                            </div>
                        </section>
                    )}

                    {/* Aviso al elegir venta: el equipo quedará marcado */}
                    {esVenta(form.motivo) && (
                        <div className="rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-[0.8rem] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                            Al registrar, este equipo quedará marcado como{" "}
                            <strong>💰 VENDIDO</strong>.
                        </div>
                    )}

                    {/* Foto de evidencia del movimiento (opcional) */}
                    <div className="rounded-[10px] border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-carbon-800">
                        <PhotoUpload
                            value={fotoFile}
                            onChange={(f) => {
                                setFotoFile(f);
                                setFotoError(null);
                            }}
                            error={fotoError}
                            disabled={guardando}
                        />
                        <p className="mt-2 text-xs text-slate-500 dark:text-neutral-400">
                            Foto de evidencia del movimiento (opcional). Si la
                            subes, reemplaza la foto actual del equipo; si no,
                            se mantiene la existente.
                        </p>
                    </div>

                    {/* Responsable autenticado (siempre) */}
                    <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                        Responsable
                        <input
                            type="text"
                            name="responsable"
                            value={form.responsable}
                            readOnly
                            aria-readonly="true"
                            ref={(el) => {
                                refs.current.responsable = el;
                            }}
                            className={clasesInput}
                        />
                        {errores.responsable && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errores.responsable}
                            </p>
                        )}
                    </label>

                    {/* Notas — opcional general, requerido si motivo es "Otro" */}
                    <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                        Notas{" "}
                        {form.motivo === "Otro" ? (
                            <span className="font-normal text-rose-600">*</span>
                        ) : (
                            <span className="font-normal text-slate-500 dark:text-neutral-400">
                                (opcional)
                            </span>
                        )}
                        <textarea
                            name="notas"
                            rows={2}
                            value={form.notas}
                            onChange={handleChange}
                            ref={(el) => {
                                refs.current.notas = el;
                            }}
                            placeholder="Cliente, condiciones, detalles relevantes..."
                            className={`${clasesInput} resize-y`}
                        />
                        {errores.notas && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errores.notas}
                            </p>
                        )}
                    </label>

                    {swapRequiereRed && (
                        <div className="rounded-[10px] border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
                            Los cambios de equipo requieren conexión. Espera
                            a tener red para enviarlo.
                        </div>
                    )}

                </div>
                    </div>

                    <footer
                        className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-200 bg-white px-5 pt-3 shadow-[0_-10px_30px_rgba(15,23,42,0.06)] sm:px-6 dark:border-white/10 dark:bg-carbon-900"
                        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
                    >
                        <button
                            type="submit"
                            disabled={guardando}
                            className="order-2 min-h-[48px] rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white shadow-[0_4px_12px_rgba(37,99,235,0.24)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {guardando ? "Guardando…" : "Registrar movimiento"}
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={guardando}
                            className="order-1 min-h-[48px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/15 dark:bg-carbon-800 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                            Cancelar
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
}

/**
 * Buscador reutilizable de clientes para arriendo, venta y swap.
 * Permite buscar por cualquier parte del nombre, ignorando mayúsculas y
 * tildes, sin depender del comportamiento limitado de un <select> nativo.
 */
function ClienteSelect({
    name,
    form,
    errores,
    refs,
    clasesInput,
    onChange,
    clientes,
    onCrearCliente,
}) {
    const [busqueda, setBusqueda] = useState("");
    const [abierto, setAbierto] = useState(false);
    const clienteSeleccionado = clientes.find(
        (cliente) => String(cliente.id) === String(form[name]),
    );

    useEffect(() => {
        if (!form[name]) {
            setBusqueda("");
            setAbierto(false);
        }
    }, [form, name]);

    const opcionesFiltradas = useMemo(() => {
        const termino = normalizarTextoBusqueda(busqueda);
        if (!termino) return clientes.slice(0, 60);
        return clientes
            .filter((cliente) =>
                normalizarTextoBusqueda(cliente.razon_social).includes(termino),
            )
            .slice(0, 60);
    }, [busqueda, clientes]);

    const seleccionarCliente = (cliente) => {
        onChange({
            target: {
                name,
                value: String(cliente.id),
            },
        });
        setBusqueda(cliente.razon_social);
        setAbierto(false);
    };

    const valorInput = abierto
        ? busqueda
        : clienteSeleccionado?.razon_social ?? busqueda;

    return (
        <div>
            <div className="flex items-end gap-2">
                <label className="flex-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Cliente
                    <div className="relative">
                        <input
                            type="text"
                            role="combobox"
                            aria-expanded={abierto}
                            aria-autocomplete="list"
                            placeholder="Busca por nombre o razón social"
                            value={valorInput}
                            onChange={(event) => {
                                setBusqueda(event.target.value);
                                setAbierto(true);
                            }}
                            onFocus={() => {
                                setAbierto(true);
                                setBusqueda("");
                            }}
                            onBlur={() => {
                                window.setTimeout(() => setAbierto(false), 150);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                    setAbierto(false);
                                    return;
                                }
                                if (
                                    event.key === "Enter" &&
                                    abierto &&
                                    opcionesFiltradas[0]
                                ) {
                                    event.preventDefault();
                                    seleccionarCliente(opcionesFiltradas[0]);
                                }
                            }}
                            ref={(elemento) => {
                                refs.current[name] = elemento;
                            }}
                            className={clasesInput + " pr-10"}
                        />
                        <span
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                            aria-hidden="true"
                        >
                            🔎
                        </span>

                        {abierto && (
                            <div
                                role="listbox"
                                className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/15 dark:bg-carbon-800"
                            >
                                {opcionesFiltradas.length > 0 ? (
                                    opcionesFiltradas.map((cliente) => (
                                        <button
                                            key={cliente.id}
                                            type="button"
                                            role="option"
                                            aria-selected={
                                                String(cliente.id) ===
                                                String(form[name])
                                            }
                                            onMouseDown={(event) =>
                                                event.preventDefault()
                                            }
                                            onClick={() =>
                                                seleccionarCliente(cliente)
                                            }
                                            className={
                                                "flex min-h-[44px] w-full items-center rounded-lg px-3 py-2 text-left text-sm transition hover:bg-blue-50 dark:hover:bg-blue-500/10 " +
                                                (String(cliente.id) ===
                                                String(form[name])
                                                    ? "bg-blue-50 font-bold text-blue-800 dark:bg-blue-500/15 dark:text-blue-300"
                                                    : "text-slate-700 dark:text-slate-200")
                                            }
                                        >
                                            {cliente.razon_social}
                                        </button>
                                    ))
                                ) : (
                                    <p className="px-3 py-3 text-sm text-slate-500 dark:text-neutral-400">
                                        No encontramos un cliente con ese texto.
                                    </p>
                                )}
                                {clientes.length > 60 && !busqueda && (
                                    <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500 dark:border-white/10 dark:text-neutral-400">
                                        Escribe para filtrar la lista.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </label>
                {onCrearCliente && (
                    <button
                        type="button"
                        onClick={onCrearCliente}
                        className="mb-1 inline-flex h-[44px] shrink-0 items-center gap-1.5 rounded-[10px] border-[1.5px] border-sky-300 bg-sky-50 px-3 text-[0.82rem] font-bold text-sky-800 transition hover:bg-sky-100 active:scale-95 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-400 dark:hover:bg-sky-500/20"
                        title="Crear un cliente nuevo en el catálogo"
                    >
                        + Nuevo
                    </button>
                )}
            </div>
            {errores[name] && (
                <p className="mt-1 text-xs font-medium text-rose-600">
                    {errores[name]}
                </p>
            )}
        </div>
    );
}

/**
 * Sub-componente que renderiza los campos dinámicos según motivo.
 * Aísla la lógica del switch para no inflar MovimientoDialog.
 */
function CamposPorMotivo({
    form,
    errores,
    refs,
    clasesInput,
    onChange,
    clientes,
    equiposParaSwap,
    cargandoEquiposCliente,
    onCrearCliente,
    equipoEnCliente,
    equipoEnMantencion,
    bodegaOrigen,
    clienteActual,
    clienteRetorno,
}) {
    const [busquedaEquipo, setBusquedaEquipo] = useState("");
    const { tipo } = useMemo(
        () => camposPorMotivo(form.motivo),
        [form.motivo],
    );
    const equiposSwapFiltrados = useMemo(() => {
        const texto = normalizarTextoBusqueda(busquedaEquipo);
        if (!texto) return equiposParaSwap;
        return equiposParaSwap.filter(
            (equipo) =>
                String(equipo.id) === String(form.equipo_recibe_id) ||
                [
                    equipo.correlativo,
                    equipo.numero_interno,
                    equipo.numero_serie,
                    equipo.tipo_equipo,
                    equipo.marca,
                    equipo.modelo,
                    equipo.bodega,
                ].some((valor) =>
                    normalizarTextoBusqueda(valor).includes(texto),
                ),
        );
    }, [busquedaEquipo, equiposParaSwap, form.equipo_recibe_id]);

    useEffect(() => {
        setBusquedaEquipo("");
    }, [form.motivo, form.cliente_id]);

    if (tipo === "ninguno") return null;

    const opcionesBodega =
        form.motivo === "Cambio de bodega"
            ? BODEGAS.filter((bodega) => bodega !== bodegaOrigen)
            : BODEGAS;

    return (
        <>
            {/* Bodega destino (cambio de bodega / devolución) */}
            {tipo === "bodega" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                        {equipoEnMantencion
                            ? "Bodega donde quedará"
                            : "Bodega destino"}
                        <select
                            name="bodega_destino"
                            value={form.bodega_destino}
                            onChange={onChange}
                            ref={(el) => {
                                refs.current.bodega_destino = el;
                            }}
                            className={clasesInput}
                        >
                            <option value="">— Selecciona —</option>
                            {opcionesBodega.map((b) => (
                                <option key={b} value={b}>
                                    {b}
                                </option>
                            ))}
                        </select>
                        {errores.bodega_destino && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errores.bodega_destino}
                            </p>
                        )}
                    </label>
                    <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                        Ubicación destino
                        <input
                            type="text"
                            name="ubicacion_destino"
                            value={form.ubicacion_destino}
                            onChange={onChange}
                            ref={(el) => {
                                refs.current.ubicacion_destino = el;
                            }}
                            placeholder="Ej. Patio norte, Galpón 2"
                            className={clasesInput}
                        />
                    </label>
                </div>
            )}

            {/* Cliente destino (arriendo / venta) */}
            {tipo === "cliente" && (
                <>
                    <ClienteSelect
                        name="cliente_id"
                        form={form}
                        errores={errores}
                        refs={refs}
                        clasesInput={clasesInput}
                        onChange={onChange}
                        clientes={clientes}
                        onCrearCliente={onCrearCliente}
                    />
                    <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                        Ubicación{" "}
                        <span className="font-normal text-slate-500 dark:text-neutral-400">
                            (opcional)
                        </span>
                        <input
                            type="text"
                            name="ubicacion_destino"
                            value={form.ubicacion_destino}
                            onChange={onChange}
                            ref={(el) => {
                                refs.current.ubicacion_destino = el;
                            }}
                            placeholder="Ej. Patio norte, Galpón 2"
                            className={clasesInput}
                        />
                    </label>
                </>
            )}

            {/* Retorno fijo al cliente que originó la mantención interna */}
            {tipo === "cliente_retorno" && (
                <>
                    <div className="rounded-[10px] border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm text-violet-950 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-200">
                        <span className="block text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">
                            Cliente de retorno
                        </span>
                        <strong>
                            {clienteRetorno?.razon_social ??
                                `Cliente #${form.cliente_id}`}
                        </strong>
                        <p className="mt-1 text-xs">
                            El cliente está fijado por el ingreso a mantención y
                            no se puede cambiar en este movimiento.
                        </p>
                    </div>
                    <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                        Ubicación de retorno{" "}
                        <span className="font-normal text-slate-500 dark:text-neutral-400">
                            (opcional)
                        </span>
                        <input
                            type="text"
                            name="ubicacion_destino"
                            value={form.ubicacion_destino}
                            onChange={onChange}
                            ref={(el) => {
                                refs.current.ubicacion_destino = el;
                            }}
                            placeholder="Ej. Patio norte, Galpón 2"
                            className={clasesInput}
                        />
                    </label>
                </>
            )}

            {/* Swap (cambio de equipo bidireccional) */}
            {tipo === "swap" && (
                <>
                    {equipoEnCliente ? (
                        <div className="rounded-[10px] border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-900 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-200">
                            <span className="block text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                                Cliente del cambio
                            </span>
                            <strong>
                                {clienteActual?.razon_social ??
                                    `Cliente #${form.cliente_id}`}
                            </strong>
                        </div>
                    ) : (
                        <ClienteSelect
                            name="cliente_id"
                            form={form}
                            errores={errores}
                            refs={refs}
                            clasesInput={clasesInput}
                            onChange={onChange}
                            clientes={clientes}
                            onCrearCliente={onCrearCliente}
                        />
                    )}

                    <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                        Categoría
                        <select
                            name="categoria"
                            value={form.categoria}
                            onChange={onChange}
                            ref={(el) => {
                                refs.current.categoria = el;
                            }}
                            className={clasesInput}
                        >
                            <option value="">— Selecciona —</option>
                            {CATEGORIAS_SWAP.map((c) => (
                                <option key={c.value} value={c.value}>
                                    {c.label}
                                </option>
                            ))}
                        </select>
                        {errores.categoria && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errores.categoria}
                            </p>
                        )}
                    </label>

                    <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                        {equipoEnCliente
                            ? "Equipo reemplazante desde bodega"
                            : "Equipo que vuelve desde el cliente"}
                        <input
                            type="search"
                            value={busquedaEquipo}
                            onChange={(event) =>
                                setBusquedaEquipo(event.target.value)
                            }
                            placeholder="Buscar por N° interno, serie, marca o modelo…"
                            className={clasesInput}
                        />
                        <select
                            name="equipo_recibe_id"
                            value={form.equipo_recibe_id}
                            onChange={onChange}
                            ref={(el) => {
                                refs.current.equipo_recibe_id = el;
                            }}
                            className={clasesInput}
                            disabled={
                                (!equipoEnCliente && !form.cliente_id) ||
                                cargandoEquiposCliente
                            }
                        >
                            <option value="">
                                {cargandoEquiposCliente
                                    ? "Cargando…"
                                    : "— Selecciona —"}
                            </option>
                            {equiposSwapFiltrados.map((e) => (
                                <option key={e.id} value={e.id}>
                                    #
                                    {String(e.correlativo).padStart(4, "0")} ·
                                    {" "}
                                    {e.marca} {e.modelo}
                                    {e.numero_interno
                                        ? ` · ${e.numero_interno}`
                                        : ""}
                                    {equipoEnCliente && e.bodega
                                        ? ` · ${e.bodega}`
                                        : ""}
                                    {e.estado_operacional
                                        ? ` · ${e.estado_operacional}`
                                        : ""}
                                </option>
                            ))}
                        </select>
                        {errores.equipo_recibe_id && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errores.equipo_recibe_id}
                            </p>
                        )}
                        {form.cliente_id &&
                            !cargandoEquiposCliente &&
                            equiposParaSwap.length === 0 && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                                    {equipoEnCliente
                                        ? "No hay equipos disponibles en bodega para realizar el cambio."
                                        : "Este cliente no tiene equipos para recibir. Verifica que esté en arriendo o venta."}
                                </p>
                            )}
                        {equiposParaSwap.length > 0 &&
                            equiposSwapFiltrados.length === 0 && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                                    No hay equipos que coincidan con la búsqueda.
                                </p>
                            )}
                    </label>

                    <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                        {equipoEnCliente
                            ? "Bodega a la que vuelve este equipo"
                            : "Bodega destino del equipo recibido"}
                        <select
                            name="bodega_recibe_destino"
                            value={form.bodega_recibe_destino}
                            onChange={onChange}
                            ref={(el) => {
                                refs.current.bodega_recibe_destino = el;
                            }}
                            className={clasesInput}
                        >
                            <option value="">— Selecciona —</option>
                            {BODEGAS.map((b) => (
                                <option key={b} value={b}>
                                    {b}
                                </option>
                            ))}
                        </select>
                        {errores.bodega_recibe_destino && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errores.bodega_recibe_destino}
                            </p>
                        )}
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                            Ubicación en cliente{" "}
                            <span className="font-normal text-slate-500 dark:text-neutral-400">
                                (opcional)
                            </span>
                            <input
                                type="text"
                                name="ubicacion_destino"
                                value={form.ubicacion_destino}
                                onChange={onChange}
                                ref={(el) => {
                                    refs.current.ubicacion_destino = el;
                                }}
                                placeholder="Ej. Patio norte, Galpón 2"
                                className={clasesInput}
                            />
                        </label>
                        <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                            Ubicación en bodega{" "}
                            <span className="font-normal text-slate-500 dark:text-neutral-400">
                                (opcional)
                            </span>
                            <input
                                type="text"
                                name="ubicacion_retorno"
                                value={form.ubicacion_retorno}
                                onChange={onChange}
                                ref={(el) => {
                                    refs.current.ubicacion_retorno = el;
                                }}
                                placeholder="Ej. Servicio técnico"
                                className={clasesInput}
                            />
                        </label>
                    </div>

                    <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-[0.78rem] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                        <strong>Cambio de equipo:</strong>{" "}
                        {equipoEnCliente
                            ? "el equipo seleccionado saldrá de bodega hacia el cliente y este equipo volverá a la bodega indicada."
                            : "este equipo saldrá hacia el cliente y el equipo seleccionado volverá a la bodega indicada."}{" "}
                        Ambos movimientos se guardan juntos y quedan vinculados
                        en el historial.
                    </div>
                </>
            )}

            {/* Mantención externa */}
            {tipo === "externo" && (
                <>
                    <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                        Proveedor / destino externo{" "}
                        <span className="font-normal text-rose-600">*</span>
                        <input
                            type="text"
                            name="destino_externo"
                            value={form.destino_externo}
                            onChange={onChange}
                            ref={(el) => {
                                refs.current.destino_externo = el;
                            }}
                            placeholder="Ej. Servicio Técnico XYZ"
                            className={clasesInput}
                        />
                        {errores.destino_externo && (
                            <p className="mt-1 text-xs font-medium text-rose-600">
                                {errores.destino_externo}
                            </p>
                        )}
                    </label>
                    <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                        Ubicación{" "}
                        <span className="font-normal text-slate-500 dark:text-neutral-400">
                            (opcional)
                        </span>
                        <input
                            type="text"
                            name="ubicacion_destino"
                            value={form.ubicacion_destino}
                            onChange={onChange}
                            ref={(el) => {
                                refs.current.ubicacion_destino = el;
                            }}
                            placeholder="Detalle adicional"
                            className={clasesInput}
                        />
                    </label>
                </>
            )}

            {/* Libre (motivo = "Otro") — solo notas se pide abajo */}
            {tipo === "libre" && (
                <label className="block text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                    Ubicación{" "}
                    <span className="font-normal text-slate-500 dark:text-neutral-400">
                        (opcional)
                    </span>
                    <input
                        type="text"
                        name="ubicacion_destino"
                        value={form.ubicacion_destino}
                        onChange={onChange}
                        ref={(el) => {
                            refs.current.ubicacion_destino = el;
                        }}
                        placeholder="Detalle de ubicación"
                        className={clasesInput}
                    />
                </label>
            )}
        </>
    );
}
