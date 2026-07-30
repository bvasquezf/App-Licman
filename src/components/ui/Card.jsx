function Card({ children, className = "", padding = "p-5" }) {
    return (
        <div
            className={`rounded-[14px] border border-slate-200/60 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.10)] ${padding} ${className}`}
        >
            {children}
        </div>
    );
}

export default Card;
