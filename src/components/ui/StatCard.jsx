function StatCard({ label, value, hint, icon, tone = "brand" }) {
    const tones = {
        brand: {
            bg: "bg-brand-100",
            text: "text-brand-600",
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

    const t = tones[tone] || tones.brand;

    return (
        <div className="group flex h-full flex-col rounded-[18px] border border-stone-200/80 bg-white p-4 shadow-[0_10px_30px_rgba(49,48,48,0.07)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(49,48,48,0.12)] sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium uppercase tracking-wider text-slate-500">
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
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-base sm:h-10 sm:w-10 sm:text-lg ${t.bg}`}
                    >
                        {icon}
                    </div>
                )}
            </div>
            {hint && (
                <p className="mt-1.5 truncate text-xs text-slate-500">
                    {hint}
                </p>
            )}
        </div>
    );
}

export default StatCard;
