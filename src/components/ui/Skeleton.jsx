function Skeleton({ className = "" }) {
    return (
        <div
            className={`skeleton-shimmer rounded-lg bg-slate-200/70 dark:bg-white/10 ${className}`}
        />
    );
}

export default Skeleton;
