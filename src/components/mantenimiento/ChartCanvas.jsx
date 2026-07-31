import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { useTheme } from "../../context/ThemeContext";

Chart.register(...registerables);
Chart.defaults.font.family =
    "Outfit, ui-sans-serif, system-ui, -apple-system, sans-serif";
Chart.defaults.color = "#64748b";
Chart.defaults.borderColor = "rgba(15,23,42,0.06)";
Chart.defaults.plugins.legend.labels.boxWidth = 12;
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;

/**
 * Wrapper genérico de Chart.js v4.
 * Props: id, factory(filtered) → { type, data, options }, height, filtered
 *  - Crea/destruye el chart según cambian type o factory.
 *  - Reutiliza la instancia (in-place update) cuando cambia data.
 *  - Reajusta los colores base (texto/grids) al cambiar el tema.
 */
export default function ChartCanvas({ id, factory, filtered, height = 280 }) {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);
    const { theme } = useTheme();

    // Chart.js fija sus colores por JS, no por CSS: al alternar tema
    // actualizamos los defaults y redibujamos la instancia viva.
    useEffect(() => {
        const dark = theme === "dark";
        Chart.defaults.color = dark ? "#a3a3a3" : "#64748b";
        Chart.defaults.borderColor = dark
            ? "rgba(255,255,255,0.08)"
            : "rgba(15,23,42,0.06)";
        chartRef.current?.update();
    }, [theme]);

    useEffect(() => {
        if (!canvasRef.current) return undefined;
        const config = factory(filtered);

        if (chartRef.current && chartRef.current.config.type === config.type) {
            chartRef.current.data = config.data;
            if (config.options) chartRef.current.options = config.options;
            chartRef.current.update();
        } else {
            if (chartRef.current) chartRef.current.destroy();
            chartRef.current = new Chart(canvasRef.current, config);
        }

        function resize() {
            chartRef.current?.resize();
        }
        window.addEventListener("resize", resize);

        return () => {
            window.removeEventListener("resize", resize);
        };
    }, [factory, filtered]);

    useEffect(
        () => () => {
            chartRef.current?.destroy();
            chartRef.current = null;
        },
        [],
    );

    return (
        <div style={{ position: "relative", height }}>
            <canvas id={id} ref={canvasRef} />
        </div>
    );
}