function PageHeader({ title, subtitle, icon, actions }) {
    return (
        <div className="mb-5 flex flex-col gap-3 sm:mb-6 md:mb-8 md:flex-row md:items-start md:justify-between md:gap-4">
            <div className="flex min-w-0 items-start gap-3">
                {icon && (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-xl dark:bg-indigo-500/15 sm:h-11 sm:w-11 sm:text-2xl">
                        {icon}
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100 sm:text-2xl md:text-3xl">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:mt-1 sm:text-sm">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {actions && (
                <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:shrink-0 md:justify-end">
                    {actions}
                </div>
            )}
        </div>
    );
}

export default PageHeader;
