/**
 * compressImage
 * -------------
 * Comprime una foto en el navegador ANTES de subirla a Supabase Storage:
 * la redimensiona a MAX_DIM px en su lado mayor y la re-codifica a JPEG.
 *
 * ¿Por qué? Las fotos de iPhone pesan 2-5 MB. El plan gratis de Supabase
 * da 1 GB de storage (~340 fotos sin comprimir). A ~1600px JPEG q0.8
 * quedan en ~300 KB (~3.000 fotos), suficiente para años de operación.
 *
 * Decisiones:
 *  - Salida siempre JPEG: normaliza HEIC/PNG/WEBP y elimina metadata EXIF.
 *  - `imageOrientation: "from-image"` respeta la orientación EXIF (fotos
 *    en vertical no salen rotadas).
 *  - Fallback seguro: si el navegador no puede decodificar el archivo
 *    (ej. HEIC en Chrome de escritorio) o el resultado no achica, se
 *    devuelve el File ORIGINAL y la subida sigue su curso normal.
 */

const MAX_DIM = 1600;
const JPEG_QUALITY = 0.8;

function cargarConImg(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("No se pudo decodificar la imagen"));
        };
        img.src = url;
    });
}

/**
 * @param {File} file - Imagen original (cámara o galería).
 * @returns {Promise<File>} JPEG optimizado, o el archivo original si
 *   no se pudo/no valía la pena comprimir.
 */
export async function compressImage(file) {
    if (!file || typeof document === "undefined") return file;

    try {
        let fuente;
        let ancho;
        let alto;
        try {
            fuente = await createImageBitmap(file, {
                imageOrientation: "from-image",
            });
            ancho = fuente.width;
            alto = fuente.height;
        } catch {
            fuente = await cargarConImg(file);
            ancho = fuente.naturalWidth;
            alto = fuente.naturalHeight;
        }
        if (!ancho || !alto) return file;

        const escala = Math.min(1, MAX_DIM / Math.max(ancho, alto));
        const w = Math.max(1, Math.round(ancho * escala));
        const h = Math.max(1, Math.round(alto * escala));

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        // Fondo blanco: un PNG con transparencia no debe salir con fondo negro
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(fuente, 0, 0, w, h);
        fuente.close?.(); // libera memoria cuando es ImageBitmap

        const blob = await new Promise((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
        );
        if (!blob || blob.size >= file.size) return file;

        const base = (file.name || "foto").replace(/\.[^.]+$/, "") || "foto";
        return new File([blob], `${base}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
        });
    } catch {
        return file;
    }
}
