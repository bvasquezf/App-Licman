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
        <div className="group flex h-full flex-col rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-400 sm:text-xs">
                        {label}
                    </p>
                    <p
                        className={`mt-1.5 break-words text-xl font-semibold tabular-nums sm:mt-2 sm:text-2xl md:text-3xl ${t.text}`}
                    >
                        {value}
                    </p>
                </div>
                {icon && (
                    <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base sm:h-10 sm:w-10 sm:text-lg ${t.bg}`}
                    >
                        {icon}
                    </div>
                )}
            </div>
            {hint && (
                <p className="mt-1.5 truncate text-[10px] text-slate-400 sm:text-xs">
                    {hint}
                </p>
            )}
        </div>
    );
}

export default StatCard;
