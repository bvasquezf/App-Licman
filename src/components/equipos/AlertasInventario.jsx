import { useMemo } from "react";

// Umbral de días para la alerta de inoperativos antiguos.
const DIAS_INOPERATIVO = 30;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Referencia de "ahora" tomada al cargar el módulo. Va fuera del render
// porque Date.now() es impura (regla react-hooks/purity); para una
// alerta de 30 días la precisión de carga de página sobra.
const AHORA = Date.now();

// Misma lógica de parseFaltantes de ListView: el campo llega como
// string separado por comas (o array jsonb en registros nuevos).
function parseFaltantes(valor) {
    if (!valor) return [];
    if (Array.isArray(valor)) return valor.filter(Boolean);
    return String(valor)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

// Estilo base calcado del banner de N° internos duplicados de ListView,
// variando el color según severidad.
const ESTILOS_SEVERIDAD = {
    red: "border-red-600 bg-red-50 text-red-900 dark:bg-red-500/10 dark:text-red-300",
    amber: "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-300",
    blue: "border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-500/10 dark:text-blue-300",
};

/**
 * Banners informativos con alertas accionables del inventario.
 * Deriva todo de los equipos activos (sin tocar la base ni cargar
 * movimientos). Si no hay alertas, no renderiza nada.
 *
 * Props:
 *   equipos: array de equipos activos (sin papelera).
 */
export default function AlertasInventario({ equipos }) {
    const alertas = useMemo(() => {
        const lista = [];

        const inoperativos = equipos.filter(
            (e) => e.estado_operacional === "Inoperativo",
        );
        if (inoperativos.length > 0) {
            lista.push({
                id: "inoperativos",
                severidad: "red",
                icono: "⚠️",
                titulo:
                    inoperativos.length === 1
                        ? "Hay 1 equipo inoperativo"
                        : `Hay ${inoperativos.length} equipos inoperativos`,
                detalle:
                    "Revisá el chip “Inoperativos” para ver el detalle y gestionar su reparación o baja.",
            });
        }

        const conFaltantes = equipos.filter(
            (e) => parseFaltantes(e.elementos_faltantes).length > 0,
        );
        if (conFaltantes.length > 0) {
            lista.push({
                id: "con_faltantes",
                severidad: "amber",
                icono: "🧩",
                titulo:
                    conFaltantes.length === 1
                        ? "1 equipo tiene elementos faltantes"
                        : `${conFaltantes.length} equipos tienen elementos faltantes`,
                detalle:
                    "Falta documentar o reponer elementos (cabina, batería, extintor, etc.). Filtrá con el chip “Con faltantes”.",
            });
        }

        const sinFoto = equipos.filter((e) => !e.foto_enviada);
        if (sinFoto.length > 0) {
            lista.push({
                id: "sin_foto",
                severidad: "blue",
                icono: "📷",
                titulo:
                    sinFoto.length === 1
                        ? "1 equipo no tiene foto registrada"
                        : `${sinFoto.length} equipos no tienen foto registrada`,
                detalle:
                    "La foto ayuda a identificar el equipo en terreno. Podés subirla desde la ficha de cada equipo.",
            });
        }

        // La tabla equipos solo tiene created_at (no hay updated_at):
        // se usa la fecha de registro como referencia. Equipos sin
        // created_at válida se omiten de esta regla.
        const inoperativosAntiguos = inoperativos.filter((e) => {
            if (!e.created_at) return false;
            const fecha = Date.parse(e.created_at);
            return (
                Number.isFinite(fecha) &&
                AHORA - fecha > DIAS_INOPERATIVO * MS_POR_DIA
            );
        });
        if (inoperativosAntiguos.length > 0) {
            lista.push({
                id: "inoperativos_antiguos",
                severidad: "red",
                icono: "⏳",
                titulo:
                    inoperativosAntiguos.length === 1
                        ? `1 equipo lleva más de ${DIAS_INOPERATIVO} días inoperativo`
                        : `${inoperativosAntiguos.length} equipos llevan más de ${DIAS_INOPERATIVO} días inoperativos`,
                detalle:
                    "Se registraron hace más de 30 días y siguen inoperativos. Considerá gestionar su reparación o darlos de baja.",
            });
        }

        return lista;
    }, [equipos]);

    if (alertas.length === 0) return null;

    return (
        <div className="mt-3 space-y-2" aria-label="Alertas del inventario">
            {alertas.map((a) => (
                <div
                    key={a.id}
                    className={`flex items-start gap-2.5 rounded-[10px] border-l-4 px-3 py-2.5 text-[0.85rem] ${ESTILOS_SEVERIDAD[a.severidad]}`}
                >
                    <span className="text-base">{a.icono}</span>
                    <div className="min-w-0 flex-1">
                        <p className="font-bold">{a.titulo}</p>
                        <p className="mt-0.5 text-[0.8rem] opacity-90">
                            {a.detalle}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
