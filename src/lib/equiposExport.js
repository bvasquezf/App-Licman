// Export a Excel del Inventario de Equipos.
// Portada del proyecto original (inventario-app/src/lib/export.js).

import * as XLSX from "xlsx";
import { EXCEL_COLUMN_ORDER, EXCEL_HEADERS } from "./equiposConstants";

/**
 * Exporta la lista de equipos a un archivo .xlsx.
 *
 * @param {Array} equipos - Lista de equipos a exportar.
 * @param {{ bodega?: string }} [opts] - Si se pasa bodega, filtra
 *   solo esa bodega. Si no, exporta "completo".
 */
export function exportarAExcel(equipos, opts = {}) {
    const filtrados = opts.bodega
        ? equipos.filter((e) => e.bodega === opts.bodega)
        : equipos;

    if (filtrados.length === 0) {
        throw new Error("No hay equipos para exportar.");
    }

    // Construir filas en el orden definido
    const filas = filtrados.map((e) => {
        const fila = {};
        for (const key of EXCEL_COLUMN_ORDER) {
            let val = e[key];

            // Mapeos especiales
            if (key === "foto_enviada" || key === "vendido") {
                val = val ? "Sí" : "No";
            } else if (key === "elementos_faltantes") {
                val = Array.isArray(val) ? val.join(", ") : val || "";
            } else if (key === "horometro" && val !== null && val !== "") {
                val = Number(val);
            } else if (key === "created_at" && val) {
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
        Bodega: 14,
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
        "Fecha Registro": 22,
    };
    ws["!cols"] = Object.keys(EXCEL_HEADERS).map((k) => ({
        wch: anchos[EXCEL_HEADERS[k]] || 14,
    }));

    // Freeze header row
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };

    const wb = XLSX.utils.book_new();
    const sheetName =
        opts.bodega?.slice(0, 25) || "Completo"; // Excel: max 31 chars
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const hoy = new Date().toISOString().slice(0, 10);
    const filename = `inventario-licman-${
        opts.bodega ? opts.bodega.toLowerCase() : "completo"
    }-${hoy}.xlsx`;

    XLSX.writeFile(wb, filename);
    return filename;
}