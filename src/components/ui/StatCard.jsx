function StatCard({ label, value, hint, icon, tone = "indigo" }) {
    const tones = {
        indigo: {
            bg: "bg-indigo-50 dark:bg-indigo-500/15",
            text: "text-indigo-600 dark:text-indigo-400",
        },
        emerald: {
            bg: "bg-emerald-50 dark:bg-emerald-500/15",
            text: "text-emerald-600 dark:text-emerald-400",
        },
        amber: {
            bg: "bg-amber-50 dark:bg-amber-500/15",
            text: "text-amber-600 dark:text-amber-400",
        },
        rose: {
            bg: "bg-rose-50 dark:bg-rose-500/15",
            text: "text-rose-600 dark:text-rose-400",
        },
    };

    const t = tones[tone] || tones.indigo;

    return (
        <div className="group flex h-full flex-col rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
                <p className="mt-1.5 truncate text-xs text-slate-500 dark:text-slate-400">
                    {hint}
                </p>
            )}
        </div>
    );
}

export default StatCard;
