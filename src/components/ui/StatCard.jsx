function StatCard({ label, value, hint, icon, tone = "indigo" }) {
    const tones = {
        indigo: {
            bg: "bg-indigo-50",
            text: "text-indigo-600",
        },
        emerald: {
            bg: "bg-emerald-50",
            text: "text-emerald-600",
        },
        amber: {
            bg: "bg-amber-50",
            text: "text-amber-600",
        },
        rose: {
            bg: "bg-rose-50",
            text: "text-rose-600",
        },
    };

    const t = tones[tone] || tones.indigo;

    return (
        <div className="group rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        {label}
                    </p>
                    <p className={`mt-2 text-2xl font-semibold tabular-nums ${t.text} md:text-3xl`}>
                        {value}
                    </p>
                    {hint && (
                        <p className="mt-2 text-xs text-slate-400">{hint}</p>
                    )}
                </div>
                {icon && (
                    <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${t.bg}`}
                    >
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
}

export default StatCard;
