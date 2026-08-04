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

// Chips compactos con el color según severidad (misma paleta que los
// filtros rápidos de ListView).
const ESTILOS_SEVERIDAD = {
    red: "border-red-300 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400",
    amber: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
    blue: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400",
};

/**
 * Chips compactos con las alertas accionables del inventario.
 * Deriva todo de los equipos activos (sin tocar la base ni cargar
 * movimientos). Si no hay alertas, no renderiza nada.
 *
 * Cada chip muestra icono + conteo corto; la explicación larga va en
 * el tooltip nativo (title) para no ocupar espacio vertical.
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
                texto:
                    inoperativos.length === 1
                        ? "1 inoperativo"
                        : `${inoperativos.length} inoperativos`,
                tooltip:
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
                texto:
                    conFaltantes.length === 1
                        ? "1 con faltantes"
                        : `${conFaltantes.length} con faltantes`,
                tooltip:
                    "Falta documentar o reponer elementos (cabina, batería, extintor, etc.). Filtrá con el chip “Con faltantes”.",
            });
        }

        const sinFoto = equipos.filter((e) => !e.foto_enviada);
        if (sinFoto.length > 0) {
            lista.push({
                id: "sin_foto",
                severidad: "blue",
                icono: "📷",
                texto:
                    sinFoto.length === 1
                        ? "1 sin foto"
                        : `${sinFoto.length} sin foto`,
                tooltip:
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
                texto:
                    inoperativosAntiguos.length === 1
                        ? `1 inoperativo +${DIAS_INOPERATIVO} días`
                        : `${inoperativosAntiguos.length} inoperativos +${DIAS_INOPERATIVO} días`,
                tooltip: `Se registraron hace más de ${DIAS_INOPERATIVO} días y siguen inoperativos. Considerá gestionar su reparación o darlos de baja.`,
            });
        }

        return lista;
    }, [equipos]);

    if (alertas.length === 0) return null;

    return (
        <div
            className="mt-3 flex flex-wrap gap-2"
            aria-label="Alertas del inventario"
        >
            {alertas.map((a) => (
                <span
                    key={a.id}
                    title={a.tooltip}
                    className={`inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-3 py-1 text-[0.75rem] font-bold ${ESTILOS_SEVERIDAD[a.severidad]}`}
                >
                    <span aria-hidden="true">{a.icono}</span>
                    {a.texto}
                </span>
            ))}
        </div>
    );
}
