function PageHeader({ title, subtitle, icon, actions }) {
    return (
        <div className="mb-5 flex flex-col gap-3 sm:mb-6 md:mb-8 md:flex-row md:items-center md:justify-between md:gap-4">
            <div className="flex items-start gap-3">
                {icon && (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-xl sm:h-11 sm:w-11 sm:text-2xl">
                        {icon}
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl md:text-3xl">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="mt-0.5 text-xs text-slate-500 sm:mt-1 sm:text-sm">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {actions && (
                <div className="flex flex-wrap items-center gap-2 md:shrink-0">
                    {actions}
                </div>
            )}
        </div>
    );
}

export default PageHeader;
