function Card({ children, className = "", padding = "p-5" }) {
    return (
        <div
            className={`rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 ${padding} ${className}`}
        >
            {children}
        </div>
    );
}

export default Card;
