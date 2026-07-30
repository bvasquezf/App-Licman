function Card({ children, className = "", padding = "p-5" }) {
    return (
        <div
            className={`rounded-[18px] border border-brand-100/80 bg-white shadow-[0_10px_30px_rgba(90,50,180,0.08)] ${padding} ${className}`}
        >
            {children}
        </div>
    );
}

export default Card;
