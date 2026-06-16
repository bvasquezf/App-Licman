import * as XLSX from "xlsx";

/**
 * Exporta datos a un archivo Excel de una sola hoja.
 * @returns {boolean} true si exportó, false si no había datos.
 */
export function exportToExcel(data, fileName, sheetName = "Hoja1") {
    if (!data || data.length === 0) {
        return false;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
    return true;
}
