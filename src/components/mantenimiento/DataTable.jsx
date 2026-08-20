/**
 * Tabla genérica con header declarativo.
 * Props: columns (array), rows (array)
 * Cada column = { key, header, render?(row), className? }
 */
export default function DataTable({ columns, rows, emptyLabel = "Sin datos" }) {
    if (!rows || rows.length === 0) {
        return (
            <div className="rounded-[10px] border-2 border-dashed border-slate-300 px-5 py-7 text-center text-sm text-slate-500 dark:border-white/15 dark:text-neutral-400">
                {emptyLabel}
            </div>
        );
    }
    return (
        <>
            <div className="grid gap-3 lg:hidden">
                {rows.map((row, idx) => (
                    <article
                        key={row.id ?? idx}
                        className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-carbon-800"
                    >
                        <dl className="divide-y divide-slate-100 dark:divide-white/5">
                            {columns.map((col) => (
                                <div
                                    key={col.key}
                                    className="grid grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] items-start gap-3 py-2 first:pt-0 last:pb-0"
                                >
                                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                                        {col.header}
                                    </dt>
                                    <dd
                                        className={`min-w-0 text-sm text-slate-800 dark:text-slate-100 ${
                                            col.align === "right"
                                                ? "text-right"
                                                : col.align === "center"
                                                  ? "text-center"
                                                  : ""
                                        }`}
                                    >
                                        {col.render
                                            ? col.render(row)
                                            : row[col.key] ?? "—"}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </article>
                ))}
            </div>

            <div className="hidden overflow-hidden rounded-[10px] border border-slate-200 dark:border-white/10 lg:block">
            <table className="w-full table-fixed text-sm">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={`px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 ${
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
                            className="border-b border-slate-100 last:border-b-0 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                        >
                            {columns.map((col) => (
                                <td
                                    key={col.key}
                                    className={`px-3 py-2.5 align-middle text-[0.88rem] text-slate-700 dark:text-slate-200 ${col.className ?? ""}`}
                                >
                                    {col.render ? col.render(row) : row[col.key] ?? "—"}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>
        </>
    );
}
