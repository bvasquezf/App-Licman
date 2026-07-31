function Card({ children, className = "", padding = "p-5" }) {
    return (
        <div
            className={`rounded-[18px] border border-stone-200/80 bg-white shadow-[0_10px_30px_rgba(49,48,48,0.07)] ${padding} ${className}`}
        >
            {children}
        </div>
    );
}

export default Card;
