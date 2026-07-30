/**
 * EquipoFoto
 * ----------
 * Thumbnail de la foto de un equipo. Si el equipo tiene `foto_url`
 * (path en Storage privado), pide una signed URL (cacheada) y la
 * muestra. Si no tiene, muestra un placeholder con icono.
 *
 * Props:
 *  - path: string|null  → path del archivo en `equipos-fotos`.
 *  - size: "sm" | "md" | "lg" (default "md").
 *  - className: string opcional para override externo.
 *  - alt: string (default "Foto del equipo").
 *  - onClick: () => void opcional — si se pasa, el thumbnail se vuelve
 *    clickeable y abre la foto en una pestaña nueva.
 */
import { useEffect, useState } from "react";
import { getFotoUrlCached } from "../../lib/equiposStorage";

const SIZES = {
    sm: { box: "h-12 w-12", icon: "text-base", rounded: "rounded-[8px]" },
    md: { box: "h-20 w-20 sm:h-24 sm:w-24", icon: "text-2xl", rounded: "rounded-[10px]" },
    lg: { box: "h-40 w-40", icon: "text-4xl", rounded: "rounded-[12px]" },
};

export default function EquipoFoto({
    path,
    size = "md",
    className = "",
    alt = "Foto del equipo",
    onClick,
}) {
    const [url, setUrl] = useState(null);
    const [estado, setEstado] = useState("idle"); // idle | loading | ok | error

    useEffect(() => {
        // Reset cuando cambia el path
        setUrl(null);
        setEstado("idle");
        if (!path) return undefined;

        let cancelado = false;
        setEstado("loading");
        (async () => {
            try {
                const u = await getFotoUrlCached(path, 3600);
                if (cancelado) return;
                if (u) {
                    setUrl(u);
                    setEstado("ok");
                } else {
                    setEstado("error");
                }
            } catch {
                if (!cancelado) setEstado("error");
            }
        })();
        return () => {
            cancelado = true;
        };
    }, [path]);

    const cfg = SIZES[size] ?? SIZES.md;
    const baseClasses = `${cfg.box} ${cfg.rounded} overflow-hidden border border-slate-200 bg-slate-100 shrink-0`;

    // Placeholder: sin foto o error cargando
    if (!path || estado === "error") {
        return (
            <div
                className={`${baseClasses} flex items-center justify-center text-slate-400 ${
                    className}
                `}
                aria-label={path ? "Sin foto disponible" : "Sin foto"}
            >
                <span className={cfg.icon} aria-hidden="true">
                    📦
                </span>
            </div>
        );
    }

    // Loading skeleton
    if (estado !== "ok" || !url) {
        return (
            <div
                className={`${baseClasses} animate-pulse bg-slate-200 ${className}`}
                aria-label="Cargando foto..."
            />
        );
    }

    // Foto OK
    const img = (
        <img
            src={url}
            alt={alt}
            loading="lazy"
            decoding="async"
            className={`${baseClasses} object-cover ${className}`}
            onError={() => setEstado("error")}
        />
    );

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                className="cursor-zoom-in transition hover:opacity-90"
                aria-label="Ver foto en grande"
            >
                {img}
            </button>
        );
    }
    return img;
}