/**
 * Tabla genérica con header declarativo.
 * Props: columns (array), rows (array)
 * Cada column = { key, header, render?(row), className? }
 */
export default function DataTable({ columns, rows, emptyLabel = "Sin datos" }) {
    if (!rows || rows.length === 0) {
        return (
            <div className="rounded-[10px] border-2 border-dashed border-slate-300 px-5 py-7 text-center text-sm text-slate-500">
                {emptyLabel}
            </div>
        );
    }
    return (
        <div className="overflow-x-auto rounded-[10px] border border-slate-200">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={`px-3 py-2.5 text-left text-[0.72rem] font-bold uppercase tracking-wider text-slate-500 ${
                                    col.align === "right"
                                        ? "text-right"
                                        : col.align === "center"
                                          ? "text-center"
                                          : ""
                                }`}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => (
                        <tr
                            key={row.id ?? idx}
                            className="border-b border-slate-100 last:border-b-0 transition hover:bg-slate-50"
                        >
                            {columns.map((col) => (
                                <td
                                    key={col.key}
                                    className={`px-3 py-2.5 align-middle text-[0.88rem] text-slate-700 ${col.className ?? ""}`}
                                >
                                    {col.render ? col.render(row) : row[col.key] ?? "—"}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}