import * as XLSX from "xlsx";

/**
 * Exporta múltiples hojas a un archivo Excel.
 * @param {Array<{name: string, data: Array}>} sheets
 * @param {string} fileName
 * @returns {boolean} true si exportó, false si no había datos.
 */
export function exportWorkbook(sheets, fileName) {
    if (!sheets || sheets.length === 0) {
        return false;
    }

    const workbook = XLSX.utils.book_new();

    sheets.forEach((sheet) => {
        const data = sheet.data || [];
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
    return true;
}
