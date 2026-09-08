import { createPortal } from "react-dom";
import { useCallback, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAsync } from '../hooks/useAsync';
import { useMovimientoBodega } from '../hooks/useMovimientoBodega';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { useDialogA11y } from '../hooks/useDialogA11y';
import { useToast } from '../context/ToastContext';
import { withRetry } from '../utils/withRetry';
import { cantidadBodega, esUnidadEntera, validarCantidad } from '../lib/bodegaUtils';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';

export default function Devoluciones() {
    const [cursores, setCursores] = useState([null]);
    const [seleccionado, setSeleccionado] = useState(null);
    const toast = useToast();
    const cursor = cursores.at(-1);
    const cargar = useCallback(async () => {
        return withRetry(async () => {
            const { data, error } = await supabase.rpc('listar_retiros_bodega', { p_antes: cursor });
            if (error) throw error;
            return data || [];
        });
    }, [cursor]);
    const { data: retiros = [], loading, error, refetch } = useAsync(cargar, {
        deps: [cursor], errorContexto: 'cargar retiros', onError: (e) => toast.error(e.message),
    });
    return <div className="space-y-6">
        <PageHeader icon="↩️" title="Devoluciones" subtitle="Devuelve sobrantes a partir del retiro original" />
        <Card className="border-blue-200 dark:border-blue-500/20">
            <p className="text-sm text-slate-600 dark:text-slate-300">Selecciona el retiro y registra solo la cantidad que vuelve físicamente a bodega. El saldo por devolver es un límite del registro; puede incluir material ya consumido.</p>
        </Card>
        {error ? <Card><p role="alert">{error.message}</p><button className="mt-3 min-h-[44px] rounded-xl border border-slate-200 px-4 dark:border-white/15" onClick={refetch}>Reintentar</button></Card>
            : loading ? <Skeleton className="h-40" />
            : retiros.length === 0 ? <EmptyState icon="↩️" title="Sin retiros" description="Los retiros que puedas devolver aparecerán aquí." />
            : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{retiros.map((r) => <Card key={r.id} className="flex flex-col gap-3 transition-shadow hover:shadow-md">
                <div><p className="text-xs text-slate-500 dark:text-neutral-400">Retiro #{r.id} · {String(r.fecha).slice(0, 10)}</p><h2 className="mt-1 font-semibold">{r.nombre}</h2><p className="text-xs text-slate-500 dark:text-neutral-400">{r.codigo}</p></div>
                <p className="text-sm">{r.solicitante || 'Usuario anterior'} · {r.destino || 'Sin destino'}</p>
                {r.recipiente && <p className="text-xs text-slate-500 dark:text-neutral-400">Recipiente: {r.recipiente}</p>}
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5"><p className="text-xs text-slate-500 dark:text-neutral-400">Retirado: {cantidadBodega(r.cantidad, r.unidad)}</p><p className="mt-1 text-sm font-semibold">Puedes devolver hasta {cantidadBodega(r.disponible, r.unidad)}</p></div>
                <button disabled={Number(r.disponible) <= 0} onClick={() => setSeleccionado(r)} className="mt-auto min-h-[44px] rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-40">{Number(r.disponible) > 0 ? 'Registrar devolución' : 'Devuelto completo'}</button>
            </Card>)}</div>}
        <div className="flex items-center justify-between gap-3">
            <button disabled={loading || cursores.length === 1} onClick={() => setCursores((c) => c.slice(0, -1))} className="min-h-[44px] rounded-xl border border-slate-200 px-4 dark:border-white/15 disabled:opacity-40">Más recientes</button>
            <span className="text-xs">Página {cursores.length}</span>
            <button disabled={loading || retiros.length < 50} onClick={() => setCursores((c) => [...c, retiros.at(-1).id])} className="min-h-[44px] rounded-xl border border-slate-200 px-4 dark:border-white/15 disabled:opacity-40">Anteriores</button>
        </div>
        {seleccionado && <DevolucionDialog retiro={seleccionado} onClose={() => setSeleccionado(null)} onSaved={() => { setSeleccionado(null); void refetch(); }} />}
    </div>;
}

function DevolucionDialog({ retiro, onClose, onSaved }) {
    const [form, setForm] = useState({ cantidad: '', observacion: '' });
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const dialogRef = useRef(null);
    const guardar = useMovimientoBodega();
    useUnsavedChanges(form);
    const cerrar = () => {
        if (!guardando && ((!form.cantidad && !form.observacion) || window.confirm('Tienes datos sin guardar. ¿Cerrar la devolución?'))) onClose();
    };
    useDialogA11y(true, { dialogRef, onClose: cerrar, bloquearCierre: guardando });
    const submit = async (e) => {
        e.preventDefault();
        const mensaje = validarCantidad(form.cantidad, retiro.unidad);
        if (mensaje || Number(form.cantidad) > Number(retiro.disponible)) { setError(mensaje || 'La cantidad supera el saldo de este retiro'); return; }
        if (guardando) return;
        setGuardando(true);
        const ok = await guardar({ producto_id: retiro.producto_id, tipo_movimiento: 'entrada', motivo_movimiento: 'devolucion', retiro_id: retiro.id, cantidad: Number(form.cantidad), observacion: form.observacion.trim() || null });
        setGuardando(false);
        if (ok) onSaved();
    };
    const input = 'min-h-[44px] w-full rounded-xl border border-slate-200 bg-white p-3 text-base dark:border-white/15 dark:bg-carbon-800';
    return createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={cerrar}>
        <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="devolucion-titulo" tabIndex={-1} onClick={(e) => e.stopPropagation()} className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl motion-safe:animate-fade-in dark:bg-carbon-900">
            <div className="flex items-start justify-between gap-3"><div><h2 id="devolucion-titulo" className="text-lg font-semibold">Devolver a bodega</h2><p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">{retiro.nombre} · retiro #{retiro.id}</p></div><button type="button" disabled={guardando} onClick={cerrar} aria-label="Cerrar" className="h-11 w-11 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10">✕</button></div>
            <form onSubmit={submit} className="mt-5 space-y-4">
                <label className="block text-sm">Cantidad ({retiro.unidad})<input className={`${input} mt-2`} disabled={guardando} required type="number" inputMode="decimal" min={esUnidadEntera(retiro.unidad) ? 1 : 0.001} step={esUnidadEntera(retiro.unidad) ? 1 : 0.001} max={retiro.disponible} value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} /></label>
                <p className="text-xs text-slate-500 dark:text-neutral-400">Máximo: {cantidadBodega(retiro.disponible, retiro.unidad)}. Devuelve únicamente material apto para volver al stock.</p>
                <label className="block text-sm">Observación<textarea disabled={guardando} className={`${input} mt-2`} rows={3} value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} placeholder="Ej: Sobrante sin usar de la OT 125" /></label>
                {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
                <button disabled={guardando} className="min-h-[44px] w-full rounded-xl bg-blue-600 p-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50">{guardando ? 'Registrando…' : 'Confirmar devolución'}</button>
            </form>
        </section>
    </div>, document.body);
}
