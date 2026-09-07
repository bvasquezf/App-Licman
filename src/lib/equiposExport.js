// Export a Excel del Inventario de Equipos.
// Portada del proyecto original (inventario-app/src/lib/export.js).

import * as XLSX from "xlsx";
import {
    BODEGA_EN_CLIENTE,
    ESTADO_UBICACION_POR_REGULARIZAR,
    EXCEL_COLUMN_ORDER,
    EXCEL_HEADERS,
    UBICACION_POR_REGULARIZAR,
} from "./equiposConstants";
import { descripcionUltimaUbicacion } from "./equiposPresentacion";

/**
 * Exporta la lista de equipos a un archivo .xlsx.
 *
 * @param {Array} equipos - Lista de equipos a exportar.
 * @param {{ bodega?: string, clientes?: Array }} [opts] - Si se pasa
 *   bodega, filtra solo esa ubicación. BODEGA_EN_CLIENTE incluye equipos
 *   con cliente_id. La lista de clientes permite completar la ficha del
 *   cliente en cada fila.
 */
export function exportarAExcel(equipos, opts = {}) {
    const clientesPorId = new Map(
        (opts.clientes ?? []).map((cliente) => [cliente.id, cliente]),
    );
    const filtrados = opts.bodega
        ? opts.bodega === BODEGA_EN_CLIENTE
            ? equipos.filter((e) => Boolean(e.cliente_id))
            : opts.bodega === UBICACION_POR_REGULARIZAR
              ? equipos.filter(
                    (e) =>
                        e.estado_ubicacion ===
                        ESTADO_UBICACION_POR_REGULARIZAR,
                )
              : equipos.filter((e) => e.bodega === opts.bodega)
        : equipos;

    if (filtrados.length === 0) {
        throw new Error("No hay equipos para exportar.");
    }

    // Construir filas en el orden definido
    const filas = filtrados.map((e) => {
        const fila = {};
        const cliente =
            e.cliente ?? clientesPorId.get(e.cliente_id) ?? null;
        const clienteRetorno = clientesPorId.get(e.cliente_retorno_id) ?? null;
        for (const key of EXCEL_COLUMN_ORDER) {
            let val = e[key];

            // Mapeos especiales
            if (key === "ubicacion_logistica") {
                val =
                    e.estado_ubicacion ===
                    ESTADO_UBICACION_POR_REGULARIZAR
                    ? "Por regularizar"
                    : e.cliente_id
                      ? "En cliente"
                      : e.bodega || e.ubicacion_actual || "Sin ubicación";
            } else if (key === "ultima_ubicacion_registrada") {
                val =
                    e.estado_ubicacion ===
                    ESTADO_UBICACION_POR_REGULARIZAR
                        ? descripcionUltimaUbicacion(e, clientesPorId)
                        : "";
            } else if (key === "detalle_regularizacion") {
                val =
                    e.estado_ubicacion ===
                    ESTADO_UBICACION_POR_REGULARIZAR
                        ? e.ultimo_movimiento?.notas
                        : "";
            } else if (key === "cliente_nombre") {
                val =
                    cliente?.razon_social ??
                    (e.cliente_id ? `Cliente #${e.cliente_id}` : "");
            } else if (key === "cliente_rut") {
                val = cliente?.rut;
            } else if (key === "cliente_mail") {
                val = cliente?.mail;
            } else if (key === "cliente_contacto") {
                val = cliente?.contacto;
            } else if (key === "cliente_celular") {
                val = cliente?.celular;
            } else if (key === "cliente_direccion") {
                val = cliente?.direccion;
            } else if (key === "cliente_comuna") {
                val = cliente?.comuna;
            } else if (key === "cliente_activo") {
                val = cliente ? (cliente.activo ? "Sí" : "No") : "";
            } else if (key === "cliente_retorno_nombre") {
                val =
                    clienteRetorno?.razon_social ??
                    (e.cliente_retorno_id
                        ? `Cliente #${e.cliente_retorno_id}`
                        : "");
            } else if (key === "foto_enviada" || key === "vendido") {
                val = val ? "Sí" : "No";
            } else if (key === "elementos_faltantes") {
                val = Array.isArray(val) ? val.join(", ") : val || "";
            } else if (key === "horometro" && val !== null && val !== "") {
                val = Number(val);
            } else if (
                [
                    "created_at",
                    "vendido_at",
                    "ubicacion_por_regularizar_at",
                ].includes(key) &&
                val
            ) {
                val = new Date(val).toISOString();
            }

            fila[EXCEL_HEADERS[key]] = val ?? "";
        }
        return fila;
    });

    const ws = XLSX.utils.json_to_sheet(filas);

    // Anchos de columna (en caracteres)
    const anchos = {
        Correlativo: 12,
        "Ubicación logística": 20,
        "Última ubicación registrada": 36,
        "Marcado por regularizar": 24,
        "Detalle de regularización": 48,
        Bodega: 14,
        "ID Cliente": 12,
        Cliente: 32,
        "RUT Cliente": 16,
        "Correo Cliente": 32,
        "Contacto Cliente": 24,
        "Celular Cliente": 18,
        "Dirección Cliente": 32,
        "Comuna Cliente": 18,
        "Cliente activo": 14,
        "Tipo de Equipo": 32,
        "N° Interno": 14,
        "N° Serie": 18,
        Marca: 14,
        Modelo: 18,
        Ubicación: 18,
        Estado: 26,
        Horómetro: 12,
        "Elementos Faltantes": 26,
        Observaciones: 30,
        Responsable: 18,
        "Foto Enviada": 14,
        Vendido: 10,
        "Fecha Venta": 22,
        "Retorno pendiente a": 30,
        "Fecha Registro": 22,
    };
    ws["!cols"] = Object.keys(EXCEL_HEADERS).map((k) => ({
        wch: anchos[EXCEL_HEADERS[k]] || 14,
    }));

    // Freeze header row
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };

    const wb = XLSX.utils.book_new();
    const nombreUbicacion =
        opts.bodega === BODEGA_EN_CLIENTE
            ? "En cliente"
            : opts.bodega === UBICACION_POR_REGULARIZAR
              ? "Por regularizar"
              : opts.bodega;
    const sheetName = nombreUbicacion?.slice(0, 25) || "Completo"; // Excel: max 31 chars
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const hoy = new Date().toISOString().slice(0, 10);
    const filename = `inventario-licman-${
        nombreUbicacion
            ? nombreUbicacion.toLowerCase().replace(/\s+/g, "-")
            : "completo"
    }-${hoy}.xlsx`;

    XLSX.writeFile(wb, filename);
    return filename;
}
