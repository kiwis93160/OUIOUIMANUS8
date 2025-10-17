import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { Order, OrderItem } from '../types';
import { Clock, Eye, User, MapPin, Phone } from 'lucide-react';
import Modal from '../components/Modal';
import OrderTimer from '../components/OrderTimer';
import { getOrderUrgencyStyles } from '../utils/orderUrgency';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';
import useSiteContent from '../hooks/useSiteContent';
import { formatScheduleWindow, isWithinSchedule } from '../utils/timeWindow';


const TakeawayCard: React.FC<{ order: Order, onValidate?: (orderId: string) => void, onDeliver?: (orderId: string) => void, isProcessing?: boolean }> = ({ order, onValidate, onDeliver, isProcessing }) => {
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

    const displayName = order.table_nom || `Pedido #${order.id.slice(-6)}`;
    const timerStart = order.date_envoi_cuisine || order.date_creation;
    const urgencyStyles = getOrderUrgencyStyles(timerStart);
    const urgencyLabelMap: Record<typeof urgencyStyles.level, string> = {
        normal: 'Normal',
        warning: 'En seguimiento',
        critical: 'Crítico',
    };
    const hasAppliedPromotions = (order.applied_promotions?.length ?? 0) > 0;
    const showPromotionDetails = hasAppliedPromotions;

    return (
        <>
            <div className={`relative flex h-full flex-col overflow-hidden rounded-xl border text-gray-900 shadow-md transition-shadow duration-300 hover:shadow-lg ${urgencyStyles.border} ${urgencyStyles.background}`}>
                <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${urgencyStyles.accent}`} />
                <header className="border-b border-gray-200 px-5 py-4">
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                        <div className="min-w-0 space-y-1">
                            <h4 className="truncate text-base font-semibold leading-tight text-gray-900 sm:text-lg md:text-xl">{displayName}</h4>
                            <p className="text-xs text-gray-500">
                                Pedido enviado {new Date(timerStart).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        <div className="flex flex-col items-start gap-2 sm:items-end">
                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${urgencyStyles.badge}`}>
                                <span className={`h-2 w-2 rounded-full ${urgencyStyles.accent}`} />
                                <span>{urgencyLabelMap[urgencyStyles.level]}</span>
                            </span>
                            <div className="flex w-full justify-start sm:justify-end">
                                <OrderTimer startTime={timerStart} className=" text-sm sm:text-base" />
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-hidden px-5 py-4">
                    <div className="flex h-full flex-col gap-4">
                        {order.clientInfo && (
                            <section className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-900 shadow-sm">
                                {order.clientInfo.nom && (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-gray-900">
                                            <User size={16} className={urgencyStyles.icon} />
                                            <span className="font-medium">{order.clientInfo.nom}</span>
                                        </div>
                                        {order.clientInfo.telephone && (
                                            <div className="ml-6 flex items-center gap-2 text-xs text-gray-600">
                                                <Phone size={14} className="text-gray-500" />
                                                <span>{order.clientInfo.telephone}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {order.clientInfo.adresse && (
                                    <div className="flex items-start gap-2 text-gray-700">
                                        <MapPin size={16} className={`mt-0.5 text-gray-500 ${urgencyStyles.icon}`} />
                                        <span className="text-sm text-gray-700">{order.clientInfo.adresse}</span>
                                    </div>
                                )}
                            </section>
                        )}

                        <section className="flex min-h-[10rem] flex-col gap-3 overflow-hidden">
                            <h5 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Artículos</h5>
                            <div className="flex-1 overflow-y-auto pr-1">
                                {order.items.length > 0 ? (
                                    <ul className="space-y-2">
                                        {order.items.map((item: OrderItem) => {
                                            const note = item.commentaire?.trim();
                                            return (
                                                <li key={item.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex flex-1 items-center gap-3">
                                                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold text-white shadow-md ${urgencyStyles.accent}`}>
                                                                {item.quantite}
                                                            </span>
                                                            <span className="font-semibold text-gray-900 text-[clamp(0.95rem,1.9vw,1.15rem)] leading-snug break-words text-balance whitespace-normal [hyphens:auto]">
                                                                {item.nom_produit}
                                                            </span>
                                                        </div>
                                                        <span className="whitespace-nowrap text-sm font-semibold text-gray-900 sm:text-base">{formatCurrencyCOP(item.prix_unitaire * item.quantite)}</span>
                                                    </div>
                                                    {note && (
                                                        <p className="mt-2 rounded-md border border-dashed border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium italic text-blue-800">
                                                            {note}
                                                        </p>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500 shadow-sm">
                                        Este pedido aún no tiene artículos registrados.
                                    </p>
                                )}
                            </div>
                        </section>

                        {showPromotionDetails && (
                            <section className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm">
                                {hasAppliedPromotions && (
                                    <ul className="space-y-1" aria-label="Promotions">
                                        {order.applied_promotions!.map(promotion => {
                                            const promoCode = typeof promotion.config === 'object' && promotion.config !== null
                                                ? (promotion.config as Record<string, unknown>).promo_code
                                                : undefined;

                                            return (
                                                <li
                                                    key={`${promotion.promotion_id}-${promotion.name}`}
                                                    className="rounded-md border border-emerald-200 bg-white/70 px-3 py-2 text-emerald-900 shadow-sm"
                                                >
                                                    <p className="font-medium leading-tight">
                                                        {promotion.name}{promoCode ? ` (Code: ${promoCode})` : ''}
                                                    </p>
                                                    <p className="mt-1 text-sm font-semibold text-emerald-700">
                                                        -{formatCurrencyCOP(promotion.discount_amount || 0)}
                                                    </p>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </section>
                        )}

                        <div className="mt-auto flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 font-semibold text-gray-900 shadow-sm">
                            <span>Total</span>
                            <span className="text-lg sm:text-xl text-gray-900">{formatCurrencyCOP(order.total)}</span>
                        </div>
                    </div>
                </div>

                <footer className="border-t border-gray-200 px-5 pb-5 pt-4">
                    {(onValidate || onDeliver) && (
                        <div className="space-y-2">
                            <button
                                onClick={() => setIsReceiptModalOpen(true)}
                                className="w-full ui-btn ui-btn-secondary"
                                type="button"
                            >
                                <Eye size={16} className={urgencyStyles.icon} /> {order.receipt_url ? 'Ver comprobante' : 'Comprobante no disponible'}
                            </button>
                            {onValidate && order.statut === 'pendiente_validacion' && (
                                <button
                                    onClick={() => onValidate(order.id)}
                                    disabled={isProcessing}
                                    className="w-full ui-btn ui-btn-info uppercase"
                                    type="button"
                                >
                                    {isProcessing ? 'Validando...' : 'Validar'}
                                </button>
                            )}
                            {onDeliver && order.estado_cocina === 'listo' && (
                                <button
                                    onClick={() => onDeliver(order.id)}
                                    disabled={isProcessing}
                                    className="w-full ui-btn ui-btn-success uppercase"
                                    type="button"
                                >
                                    {isProcessing ? 'Procesando...' : 'Entregar'}
                                </button>
                            )}
                        </div>
                    )}
                </footer>
            </div>
            <Modal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} title="Comprobante de pago">
                {order.receipt_url ? (
                    <img src={order.receipt_url} alt="Comprobante" className="w-full h-auto rounded-md" />
                ) : (
                    <p>No se proporcionó comprobante.</p>
                )}
            </Modal>
        </>
    );
};


const ParaLlevar: React.FC = () => {
    const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
    const [readyOrders, setReadyOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
    const { content: siteContent, updateContent, loading: siteContentLoading } = useSiteContent();
    const [startTime, setStartTime] = useState('11:00');
    const [endTime, setEndTime] = useState('23:00');
    const [savingSchedule, setSavingSchedule] = useState(false);
    const [scheduleFeedback, setScheduleFeedback] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const updateNow = () => setNow(new Date());
        updateNow();
        const interval = window.setInterval(updateNow, 60000);
        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!siteContent) {
            return;
        }

        setStartTime(siteContent.onlineOrdering.schedule.startTime);
        setEndTime(siteContent.onlineOrdering.schedule.endTime);
    }, [siteContent]);

    const schedulePreview = useMemo(
        () => formatScheduleWindow({ startTime, endTime }, 'fr-FR'),
        [startTime, endTime],
    );

    const isScheduleValid = useMemo(() => {
        const pattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
        return pattern.test(startTime) && pattern.test(endTime);
    }, [startTime, endTime]);

    const isCurrentlyOnline = useMemo(
        () => isWithinSchedule({ startTime, endTime }, now),
        [endTime, now, startTime],
    );

    const handleScheduleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!siteContent || !isScheduleValid) {
            return;
        }

        setSavingSchedule(true);
        setScheduleFeedback(null);
        try {
            await updateContent({
                ...siteContent,
                onlineOrdering: {
                    ...siteContent.onlineOrdering,
                    schedule: {
                        startTime,
                        endTime,
                    },
                },
            });
            setScheduleFeedback({ message: 'Horaires mis à jour avec succès.', tone: 'success' });
        } catch (error) {
            console.error('Failed to update online ordering schedule', error);
            const message = error instanceof Error ? error.message : 'Impossible de mettre à jour les horaires.';
            setScheduleFeedback({ message, tone: 'error' });
        } finally {
            setSavingSchedule(false);
        }
    }, [endTime, isScheduleValid, siteContent, startTime, updateContent]);

    const fetchOrders = useCallback(async () => {
        // Don't set loading to true on refetches for a smoother experience
        try {
            const { pending, ready } = await api.getTakeawayOrders();
            setPendingOrders(pending.sort((a,b) => a.date_creation - b.date_creation));
            setReadyOrders(ready.sort((a,b) => (a.date_listo_cuisine || 0) - (b.date_listo_cuisine || 0)));
        } catch (error) {
            console.error("Failed to fetch takeaway orders", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchOrders();
        const interval = setInterval(fetchOrders, 10000); // Poll for new orders
        const unsubscribe = api.notifications.subscribe('orders_updated', fetchOrders);
        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, [fetchOrders]);
    
    const handleValidate = async (orderId: string) => {
        if (processingOrderId) return; // Prevent multiple actions at once
        setProcessingOrderId(orderId);
        try {
            await api.validateTakeawayOrder(orderId);
            await fetchOrders(); // Refresh immediately after action
        } catch (error: any) {
            console.error("Failed to validate order:", error);
            alert(`No se pudo validar el pedido: ${error.message}`);
        } finally {
            setProcessingOrderId(null);
        }
    };
    
    const handleDeliver = async (orderId: string) => {
        if (processingOrderId) return; // Prevent multiple actions at once
        setProcessingOrderId(orderId);
        try {
            await api.markTakeawayAsDelivered(orderId);
            await fetchOrders(); // Refresh immediately after action
        } catch (error) {
            console.error("Failed to mark order as delivered:", error);
            alert('Ocurrió un error al finalizar el pedido.');
        } finally {
            setProcessingOrderId(null);
        }
    };

    if (loading) return <div className="text-gray-700">Cargando pedidos para llevar...</div>;

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <form onSubmit={handleScheduleSubmit} className="flex flex-col gap-6 p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                <Clock size={22} />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Disponibilité de la commande en ligne</h2>
                                <p className="text-sm text-gray-500">
                                    {siteContentLoading
                                        ? 'Chargement des horaires...'
                                        : `Plage actuelle : ${schedulePreview}`}
                                </p>
                            </div>
                        </div>
                        <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                                isCurrentlyOnline
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                            }`}
                        >
                            <span className={`h-2 w-2 rounded-full ${isCurrentlyOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            {isCurrentlyOnline ? 'Ouvert' : 'Fermé'}
                        </span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex flex-col gap-2">
                            <span className="text-sm font-medium text-gray-700">Heure de début</span>
                            <input
                                type="time"
                                value={startTime}
                                onChange={event => setStartTime(event.target.value)}
                                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                required
                            />
                        </label>
                        <label className="flex flex-col gap-2">
                            <span className="text-sm font-medium text-gray-700">Heure de fin</span>
                            <input
                                type="time"
                                value={endTime}
                                onChange={event => setEndTime(event.target.value)}
                                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                required
                            />
                        </label>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {scheduleFeedback && (
                            <p
                                className={`text-sm font-medium ${
                                    scheduleFeedback.tone === 'success' ? 'text-emerald-600' : 'text-red-600'
                                }`}
                            >
                                {scheduleFeedback.message}
                            </p>
                        )}
                        <button
                            type="submit"
                            disabled={!isScheduleValid || savingSchedule || !siteContent}
                            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
                        >
                            {savingSchedule ? 'Enregistrement...' : 'Enregistrer les horaires'}
                        </button>
                    </div>
                </form>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
                {/* Column for validation */}
                <div className="bg-gray-100 p-4 rounded-xl">
                    <h2 className="text-lg sm:text-xl font-bold mb-4 text-center text-blue-700">Pendientes de validación ({pendingOrders.length})</h2>
                    <div className="space-y-4">
                        {pendingOrders.length > 0 ? pendingOrders.map(order => (
                            <TakeawayCard key={order.id} order={order} onValidate={handleValidate} isProcessing={processingOrderId === order.id} />
                        )) : <p className="text-center text-gray-500 py-8">No hay pedidos para validar.</p>}
                    </div>
                </div>

                {/* Column for ready orders */}
                <div className="bg-gray-100 p-4 rounded-xl">
                    <h2 className="text-lg sm:text-xl font-bold mb-4 text-center text-green-700">Pedidos listos ({readyOrders.length})</h2>
                    <div className="space-y-4">
                        {readyOrders.length > 0 ? readyOrders.map(order => (
                            <TakeawayCard key={order.id} order={order} onDeliver={handleDeliver} isProcessing={processingOrderId === order.id} />
                        )) : <p className="text-center text-gray-500 py-8">No hay pedidos listos.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ParaLlevar;