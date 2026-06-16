function Card({ children, className = "", padding = "p-5" }) {
    return (
        <div
            className={`rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-all duration-200 ${padding} ${className}`}
        >
            {children}
        </div>
    );
}

export default Card;
