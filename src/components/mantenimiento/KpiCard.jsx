/**
 * Tarjeta de KPI numérico grande.
 * Props: title, value, sub (línea inferior), accent ('blue' | 'emerald' | 'amber' | 'rose' | 'slate')
 */
export default function KpiCard({ title, value, sub, accent = "blue" }) {
    const accents = {
        blue: "from-blue-600 to-cyan-600",
        emerald: "from-emerald-600 to-teal-600",
        amber: "from-amber-500 to-orange-500",
        rose: "from-rose-600 to-pink-600",
        slate: "from-slate-700 to-slate-900",
    };
    return (
        <div className="relative overflow-hidden rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.10)]">
            <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accents[accent] ?? accents.blue}`}
            />
            <p className="text-[0.72rem] font-bold uppercase tracking-wider text-slate-500">
                {title}
            </p>
            <p className="mt-1.5 text-[1.85rem] font-extrabold leading-none text-slate-900 tabular-nums">
                {value}
            </p>
            {sub && (
                <p className="mt-1.5 text-xs font-medium text-slate-500">
                    {sub}
                </p>
            )}
        </div>
    );
}