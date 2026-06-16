function EmptyState({ icon = "📭", title, description, action }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 px-6 py-12 text-center">
            <div className="mb-3 text-4xl">{icon}</div>
            <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
            {description && (
                <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export default EmptyState;
