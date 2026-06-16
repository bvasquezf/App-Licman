function PageHeader({ title, subtitle, icon, actions }) {
    return (
        <div className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
                {icon && (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">
                        {icon}
                    </div>
                )}
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-800 md:text-3xl">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
                    )}
                </div>
            </div>

            {actions && (
                <div className="flex flex-wrap items-center gap-2">{actions}</div>
            )}
        </div>
    );
}

export default PageHeader;
