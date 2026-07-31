function Skeleton({ className = "" }) {
    return (
        <div
            className={`skeleton-shimmer rounded-lg bg-slate-200/70 ${className}`}
        />
    );
}

export default Skeleton;
