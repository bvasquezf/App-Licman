/**
 * PhotoUpload
 * -----------
 * Componente para tomar/subir la foto de un equipo y enviarla al
 * bucket privado `equipos-fotos` de Supabase Storage.
 *
 * Patrón: el componente NO sube automáticamente. En su lugar, expone
 * `onUpload(file)` para que el padre decida cuándo subir (típicamente
 * junto con el INSERT del equipo). Mientras tanto muestra la preview
 * local con `URL.createObjectURL`.
 *
 * Props:
 *  - value: File actual (estado controlado).
 *  - onChange(file|null): callback al elegir/quitar.
 *  - error?: string — mensaje de error a mostrar.
 *  - disabled?: boolean.
 */
export default function PhotoUpload({ value, onChange, error, disabled }) {
    const handleSeleccionar = (e) => {
        const file = e.target.files?.[0];
        if (file) onChange(file);
    };

    const handleQuitar = () => {
        onChange(null);
    };

    return (
        <div className="space-y-2">
            <p className="text-[0.85rem] font-semibold text-slate-900 dark:text-slate-100">
                Foto del equipo
            </p>

            {value ? (
                <div className="flex flex-wrap items-start gap-3">
                    <div className="relative">
                        <img
                            src={URL.createObjectURL(value)}
                            alt="Preview"
                            className="h-32 w-32 rounded-[10px] border border-slate-200 object-cover dark:border-white/10"
                            onLoad={(e) =>
                                URL.revokeObjectURL(e.currentTarget.src)
                            }
                        />
                        <button
                            type="button"
                            onClick={handleQuitar}
                            disabled={disabled}
                            className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow-md transition hover:bg-rose-700 disabled:opacity-50"
                            aria-label="Quitar foto"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="min-w-0 flex-1 text-xs text-slate-600 dark:text-neutral-400">
                        <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                            {value.name}
                        </p>
                        <p className="mt-1">
                            {(value.size / 1024).toFixed(0)} KB ·{" "}
                            {value.type || "tipo desconocido"}
                        </p>
                        <p className="mt-1 text-[0.7rem] text-slate-500 dark:text-neutral-400">
                            Se subirá al bucket privado al guardar el equipo.
                        </p>
                    </div>
                </div>
            ) : (
                <label
                    className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed px-4 py-6 text-center text-sm transition ${
                        disabled
                            ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-neutral-500"
                            : "border-slate-300 bg-slate-50 text-slate-600 hover:border-blue-400 hover:bg-blue-50/40 dark:border-white/15 dark:bg-white/5 dark:text-neutral-400 dark:hover:bg-blue-500/10"
                    }`}
                >
                    <span className="text-2xl">📷</span>
                    <span className="font-semibold">Elegir foto</span>
                    <span className="text-xs text-slate-500 dark:text-neutral-400">
                        JPG, PNG, WEBP, HEIC · hasta 5 MB
                    </span>
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                        onChange={handleSeleccionar}
                        disabled={disabled}
                        className="sr-only"
                    />
                </label>
            )}

            {error && (
                <p className="text-xs font-medium text-rose-600">⚠️ {error}</p>
            )}
        </div>
    );
}
