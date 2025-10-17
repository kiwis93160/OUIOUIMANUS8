import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { Order } from '../types';
import { CheckCircle, ChefHat, FileText, PackageCheck, User, MapPin, Receipt, Phone } from 'lucide-react';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';
import {
    clearActiveCustomerOrder,
    getActiveCustomerOrder,
    ONE_DAY_IN_MS,
    storeActiveCustomerOrder,
} from '../services/customerOrderStorage';
import Modal from './Modal';

type TrackerProgressStyle = React.CSSProperties & {
    '--tracker-progress-target': string;
};

const saveOrderToHistory = (order: Order) => {
    try {
        const historyJSON = localStorage.getItem('customer-order-history');
        const history: Order[] = historyJSON ? JSON.parse(historyJSON) : [];
        const existingIndex = history.findIndex(h => h.id === order.id);

        if (existingIndex !== -1) {
            history.splice(existingIndex, 1);
        }

        history.unshift(order); // Add to the beginning so most recent stays first

        const trimmedHistory = history.slice(0, 10); // Keep last 10 orders
        localStorage.setItem('customer-order-history', JSON.stringify(trimmedHistory));
    } catch (e) {
        console.error("Failed to save order to history:", e);
    }
};

interface CustomerOrderTrackerProps {
  orderId: string;
  onNewOrderClick: () => void;
  variant?: 'page' | 'hero';
}

const CustomerOrderTracker: React.FC<CustomerOrderTrackerProps> = ({ orderId, onNewOrderClick, variant = 'page' }) => {
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [isReceiptModalOpen, setReceiptModalOpen] = useState(false);

    const steps = [
        { name: 'Enviado', icon: FileText, description: 'Commande transmise et en attente de validation.' },
        { name: 'Validado', icon: CheckCircle, description: 'La commande est validée par l’équipe.' },
        { name: 'En preparacion', icon: ChefHat, description: 'La cuisine prépare activement votre commande.' },
        { name: 'Listo', icon: PackageCheck, description: 'La commande est prête pour la remise ou la livraison.' }
    ];

    const promotionColorSchemes = useMemo(
        () => [
            {
                gradient: 'from-brand-primary to-brand-primary-dark',
                border: 'border-brand-primary/40',
                glow: 'shadow-[0_10px_25px_rgba(249,168,38,0.35)]',
            },
            {
                gradient: 'from-emerald-500 to-emerald-600',
                border: 'border-emerald-200/70',
                glow: 'shadow-[0_10px_25px_rgba(16,185,129,0.35)]',
            },
            {
                gradient: 'from-sky-500 to-indigo-600',
                border: 'border-sky-200/70',
                glow: 'shadow-[0_10px_25px_rgba(56,189,248,0.35)]',
            },
            {
                gradient: 'from-rose-500 to-red-600',
                border: 'border-rose-200/70',
                glow: 'shadow-[0_10px_25px_rgba(244,114,182,0.35)]',
            },
            {
                gradient: 'from-amber-500 to-orange-600',
                border: 'border-amber-200/70',
                glow: 'shadow-[0_10px_25px_rgba(251,191,36,0.35)]',
            },
        ],
        []
    );

    const getCurrentStepIndex = useCallback((order: Order | null): number => {
        if (!order) return -1;

        if (
            order.statut === 'finalisee' ||
            order.estado_cocina === 'servido' ||
            order.estado_cocina === 'entregada' ||
            order.estado_cocina === 'listo'
        ) {
            return 3;
        }

        if (order.estado_cocina === 'recibido') {
            return 2;
        }

        if (order.statut === 'en_cours') {
            return 1;
        }

        if (order.statut === 'pendiente_validacion' || order.estado_cocina === 'no_enviado') {
            return 0;
        }

        return -1;
    }, []);

    const currentStep = useMemo(() => getCurrentStepIndex(order), [order, getCurrentStepIndex]);

    useEffect(() => {
        let isMounted = true;
        let interval: ReturnType<typeof setInterval> | null = null;
        let unsubscribe: (() => void) | undefined;
        let isFetching = false;

        const fetchStatus = async () => {
            if (isFetching) {
                return;
            }

            isFetching = true;

            try {
                const orderStatus = await api.getCustomerOrderStatus(orderId);
                if (isMounted) {
                    setOrder(orderStatus);
                    if (
                        orderStatus?.statut === 'finalisee' ||
                        orderStatus?.estado_cocina === 'servido' ||
                        orderStatus?.estado_cocina === 'entregada'
                    ) {
                        if (interval) {
                            clearInterval(interval);
                            interval = null;
                        }
                        saveOrderToHistory(orderStatus);
                        const servedAt = orderStatus.date_servido ?? Date.now();
                        storeActiveCustomerOrder(orderStatus.id, servedAt + ONE_DAY_IN_MS);
                    }
                    if (!orderStatus) {
                        const active = getActiveCustomerOrder();
                        if (active?.orderId === orderId) {
                            clearActiveCustomerOrder();
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to fetch order status", e);
            } finally {
                if (isMounted) {
                    setLoading(prev => (prev ? false : prev));
                }
                isFetching = false;
            }
        };

        setLoading(true);
        setOrder(null);
        fetchStatus();
        interval = setInterval(fetchStatus, 5000);
        unsubscribe = api.notifications.subscribe('orders_updated', fetchStatus);

        return () => {
            isMounted = false;
            if (interval) {
                clearInterval(interval);
            }
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [orderId]);

    const isOrderCompleted =
        order?.statut === 'finalisee' ||
        order?.estado_cocina === 'servido' ||
        order?.estado_cocina === 'entregada' ||
        order?.estado_cocina === 'listo';

    const containerClasses = variant === 'page'
        ? "container mx-auto p-4 lg:p-8"
        : "w-full px-4 pt-0 pb-4 sm:pt-1 sm:pb-5 flex justify-center";

    const contentClasses = variant === 'page'
        ? "bg-white/95 p-6 rounded-xl shadow-2xl max-w-2xl mx-auto"
        : "max-w-4xl mx-auto";

    const detailContainerClasses = 'border-t pt-6 mt-6 space-y-4 relative md:w-1/2 md:mx-auto';

    if (loading) {
        return <div className={containerClasses}>Chargement du suivi de commande...</div>;
    }

    if (!order) {
        // If order is not found and variant is hero (on home page), display nothing or a subtle message
        if (variant === 'hero') {
            return null; // Or a subtle message like 'No active order found.'
        }
        // For 'page' variant (on /commande-client), display the original message
        return (
            <div className={containerClasses}>
                <div className={contentClasses}>
                    <h2 className={`text-2xl font-bold mb-4 text-red-600`}>Commande non trouvée</h2>
                    <p className={`text-gray-600 mb-6`}>Nous n'avons pas pu retrouver votre commande.</p>
                    <button onClick={onNewOrderClick} className="bg-brand-primary text-brand-secondary font-bold py-3 px-6 rounded-lg hover:bg-yellow-400 transition">
                        Passer une nouvelle commande
                    </button>
                </div>
            </div>
        );
    }
    
    const originalSubtotal = order.subtotal ?? order.total ?? 0;
    const totalDiscount = order.total_discount ?? 0;
    const subtotalAfterDiscounts = Math.max(originalSubtotal - totalDiscount, 0);
    const hasAppliedPromotions = (order.applied_promotions?.length ?? 0) > 0;
    const isTakeawayOrder = order.type === 'a_emporter';
    const clientName = order.clientInfo?.nom ?? order.client_name ?? '';
    const clientPhone = order.clientInfo?.telephone ?? order.client_phone ?? '';
    const clientAddress = order.clientInfo?.adresse ?? order.client_address ?? '';
    const hasClientDetails = Boolean(clientName || clientPhone || clientAddress);
    const promotionBanners = hasAppliedPromotions
        ? order.applied_promotions!.map((promotion, index) => {
            const promoConfig = typeof promotion.config === 'object' && promotion.config !== null
                ? (promotion.config as Record<string, unknown>)
                : undefined;
            const promoCode = promoConfig?.promo_code as string | undefined;
            const visuals = promotion.visuals || null;
            const bannerImage = visuals?.banner_image || visuals?.banner_url;
            const bannerText = visuals?.banner_text || undefined;
            const discountAmount = promotion.discount_amount || 0;
            const scheme = promotionColorSchemes[index % promotionColorSchemes.length];

            const bannerPaddingClass = variant === 'hero' ? 'p-1.5 sm:p-2' : 'p-3 sm:p-4';
            const bannerGapClass = variant === 'hero' ? 'gap-3' : 'gap-4';
            const bannerMediaClass = variant === 'hero'
                ? 'relative h-6 w-10 flex-shrink-0 overflow-hidden rounded-xl bg-white/15'
                : 'relative h-8 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-white/15';
            const bannerFallbackTextClass = variant === 'hero'
                ? 'flex h-full w-full items-center justify-center px-2 text-center text-[9px] font-semibold leading-tight text-white'
                : 'flex h-full w-full items-center justify-center px-2 text-center text-[11px] font-semibold leading-tight text-white';
            const bannerTitleClass = variant === 'hero'
                ? 'text-xs font-semibold tracking-wide text-white whitespace-nowrap truncate'
                : 'text-sm font-semibold tracking-wide text-white whitespace-nowrap truncate';
            const bannerCodeClass = variant === 'hero'
                ? 'text-[9px] font-medium uppercase tracking-wide text-white/85 whitespace-nowrap'
                : 'text-[11px] font-medium uppercase tracking-wide text-white/85 whitespace-nowrap';
            const discountTextClass = variant === 'hero'
                ? 'block text-xs font-bold text-white'
                : 'block text-sm font-bold text-white';
            const overlayTextClass = variant === 'hero'
                ? 'absolute bottom-1 left-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide'
                : 'absolute bottom-1 left-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide';

            return (
                <div
                    key={`${promotion.promotion_id}-${promotion.name}`}
                    className={`promo-banner flex w-full items-center ${bannerGapClass} overflow-hidden rounded-2xl border bg-gradient-to-r ${bannerPaddingClass} text-white shadow-lg ${scheme.gradient} ${scheme.border} ${scheme.glow}`}
                    aria-label={`Promotion ${promotion.name}`}
                >
                    <div className={bannerMediaClass}>
                        {bannerImage ? (
                            <>
                                <img
                                    src={bannerImage}
                                    alt={bannerText || promotion.name}
                                    className="h-full w-full object-cover opacity-95"
                                />
                                {bannerText && (
                                    <div className={overlayTextClass}>
                                        {bannerText}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className={bannerFallbackTextClass}>
                                {promotion.name}
                            </div>
                        )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col text-left">
                        {(!bannerImage || !bannerText) && (
                            <span className={bannerTitleClass} title={promotion.name}>
                                {promotion.name}
                            </span>
                        )}
                        {promoCode && (
                            <span className={bannerCodeClass}>
                                Code: {promoCode}
                            </span>
                        )}
                    </div>
                    <div className="text-right whitespace-nowrap">
                        <span className={discountTextClass}>
                            -{formatCurrencyCOP(discountAmount)}
                        </span>
                    </div>
                </div>
            );
        })
        : null;

    const promotionsSectionContent = promotionBanners
        ? (
            <div className="space-y-2">
                <p className={`text-sm font-semibold ${variant === 'hero' ? 'text-green-300' : 'text-green-700'}`}>
                    Promotions appliquées
                </p>
                <div className="space-y-3">{promotionBanners}</div>
            </div>
        )
        : null;

    const stepCount = steps.length > 1 ? steps.length - 1 : 1;
    const normalizedStepIndex = Math.max(0, currentStep);
    const progressPercent = stepCount > 0
        ? Math.min(100, ((isOrderCompleted ? stepCount : normalizedStepIndex) / stepCount) * 100)
        : 100;
    const clampedProgressPercent = Math.max(0, Math.min(100, progressPercent));
    const progressAnimationKey = `${clampedProgressPercent}-${isOrderCompleted ? 'complete' : 'active'}`;
    const itemsCount = order.items?.length ?? 0;
    const heroProgressStyle: TrackerProgressStyle = {
        '--tracker-progress-target': `${clampedProgressPercent}%`,
    };

    if (variant === 'hero') {
        return (
            <div className={containerClasses}>
                <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900/90 via-slate-900/75 to-slate-900/60 p-6 text-white shadow-2xl backdrop-blur-xl sm:p-8">
                    <div className="pointer-events-none absolute inset-0 opacity-70">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_65%)]" />
                        <div className="absolute -bottom-32 right-0 h-64 w-64 rounded-full bg-gradient-to-br from-amber-400/30 via-orange-500/20 to-red-500/30 blur-3xl" />
                    </div>
                    <div className="relative flex flex-col gap-6">
                        {isOrderCompleted && (
                            <div className="pointer-events-none absolute -top-6 right-4 sm:right-8">
                                <div className="relative" style={{ transform: 'rotate(10deg)' }}>
                                    <div className="stamp-container scale-75 sm:scale-90">
                                        <div className="stamp-border">
                                            <div className="stamp-inner">
                                                <span className="stamp-text">PEDIDO</span>
                                                <span className="stamp-text stamp-text-large">LISTO</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="flex flex-col items-center gap-2 text-center">
                            <h2 className="text-3xl font-bold text-center text-white sm:text-4xl">
                                Commande #{order.id.slice(-6)}
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {steps.map((step, index) => {
                                const isActive = index === currentStep;
                                const isFinalStep = index === steps.length - 1;
                                const isCompletedStep = index < currentStep || (isFinalStep && isOrderCompleted);
                                const cardClasses = `tracker-step-card rounded-2xl border p-3 sm:p-4 transition-all ${
                                    isCompletedStep
                                        ? 'bg-gradient-to-br from-emerald-400/80 to-emerald-600/80 border-white/35 text-white shadow-lg shadow-emerald-500/25'
                                        : isActive
                                            ? 'bg-gradient-to-br from-amber-400/95 via-orange-500/90 to-red-500/95 border-white/30 text-white shadow-xl shadow-orange-500/25 tracker-step-active'
                                            : 'bg-white/10 border-white/10 text-white/70 backdrop-blur-sm hover:bg-white/15 hover:border-white/20'
                                } ${isActive ? 'scale-[1.02]' : ''}`;
                                const iconWrapperClasses = `tracker-step-icon-wrapper relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-black/25 ${
                                    isCompletedStep || isActive ? 'text-white' : 'text-white/70'
                                }`;

                                return (
                                    <div
                                        key={step.name}
                                        className={cardClasses}
                                        aria-current={isActive ? 'step' : undefined}
                                    >
                                        <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
                                            <p
                                                className={`text-xs sm:text-sm font-semibold tracking-wide ${
                                                    isCompletedStep || isActive ? 'text-white' : 'text-white/70'
                                                }`}
                                            >
                                                {step.name}
                                            </p>
                                            <div className={iconWrapperClasses}>
                                                <step.icon className="tracker-step-icon h-10 w-10 sm:h-12 sm:w-12" />
                                                {isCompletedStep && (
                                                    <CheckCircle className="absolute -top-2 -right-2 h-5 w-5 sm:h-6 sm:w-6 text-white drop-shadow" />
                                                )}
                                            </div>
                                            <p
                                                className={`text-[11px] sm:text-xs leading-snug ${
                                                    isCompletedStep || isActive ? 'text-white/80' : 'text-white/60'
                                                }`}
                                            >
                                                {step.description}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <style>{`
                            .tracker-step-card {
                                position: relative;
                                overflow: hidden;
                                border-radius: 1.25rem;
                            }

                            .tracker-step-card::after {
                                content: '';
                                position: absolute;
                                inset: 0;
                                border-radius: inherit;
                                border: 1px solid rgba(255, 255, 255, 0.18);
                                opacity: 0.35;
                                pointer-events: none;
                            }

                            .tracker-step-active {
                                animation: tracker-step-blink 1.6s ease-in-out infinite;
                            }

                            .tracker-step-active::after {
                                border-color: rgba(255, 255, 255, 0.45);
                                opacity: 0.75;
                            }

                            .tracker-step-icon {
                                transition: transform 0.4s ease;
                            }

                            .tracker-step-active .tracker-step-icon {
                                animation: tracker-step-icon-pulse 1.6s ease-in-out infinite;
                            }

                            @keyframes tracker-step-blink {
                                0%,
                                100% {
                                    transform: translateY(0);
                                    box-shadow: 0 18px 36px rgba(234, 179, 8, 0.35);
                                }
                                50% {
                                    transform: translateY(-2px);
                                    box-shadow: 0 22px 40px rgba(251, 191, 36, 0.45);
                                }
                            }

                            @keyframes tracker-step-icon-pulse {
                                0%,
                                100% {
                                    transform: scale(1);
                                }
                                50% {
                                    transform: scale(1.15);
                                }
                            }

                            .tracker-progress-container {
                                position: relative;
                                height: 10px;
                                border-radius: 9999px;
                                overflow: hidden;
                                background: linear-gradient(90deg, rgba(255, 255, 255, 0.25), rgba(148, 163, 184, 0.18));
                                box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.35);
                                margin-top: 0.25rem;
                            }

                            .tracker-progress-fill {
                                position: absolute;
                                inset: 0;
                                width: 0;
                                display: flex;
                                align-items: center;
                                justify-content: flex-end;
                                border-radius: inherit;
                                background: linear-gradient(90deg, rgba(249, 168, 38, 0.8), rgba(239, 68, 68, 0.95));
                                animation: tracker-progress-advance 1.2s ease forwards;
                                animation-delay: 0.05s;
                            }

                            .tracker-progress-fill-complete {
                                background: linear-gradient(90deg, rgba(34, 197, 94, 0.85), rgba(56, 189, 248, 0.9));
                            }

                            .tracker-progress-fill-hero {
                                animation: tracker-progress-loop 3s ease-in-out infinite;
                                animation-delay: 0s;
                            }

                            .tracker-progress-fill-hero.tracker-progress-fill-complete {
                                animation: tracker-progress-loop 3s ease-in-out infinite;
                            }

                            .tracker-progress-fill::after {
                                content: '';
                                position: absolute;
                                inset: 0;
                                background: linear-gradient(90deg, rgba(255, 255, 255, 0.25), transparent 55%);
                                mix-blend-mode: screen;
                            }

                            .tracker-progress-glow {
                                position: absolute;
                                right: -14px;
                                top: 50%;
                                width: 28px;
                                height: 28px;
                                transform: translateY(-50%);
                                background: radial-gradient(circle at center, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0));
                                pointer-events: none;
                            }

                            @keyframes tracker-progress-advance {
                                0% {
                                    width: 0;
                                }
                                100% {
                                    width: var(--tracker-progress-target);
                                }
                            }

                            @keyframes tracker-progress-loop {
                                0% {
                                    width: 0;
                                }
                                60% {
                                    width: var(--tracker-progress-target);
                                }
                                75% {
                                    width: var(--tracker-progress-target);
                                }
                                100% {
                                    width: 0;
                                }
                            }
                        `}</style>

                        <div className="tracker-progress-container tracker-progress-hero">
                            <div
                                key={`hero-progress-${progressAnimationKey}`}
                                className={`tracker-progress-fill tracker-progress-fill-hero ${isOrderCompleted ? 'tracker-progress-fill-complete' : ''}`}
                                style={heroProgressStyle}
                            >
                                <span className="tracker-progress-glow" />
                            </div>
                        </div>
                        <div className="relative">
                            {isOrderCompleted && (
                                <div
                                    aria-hidden="true"
                                    className="pointer-events-none absolute -top-6 right-4 z-20 inline-flex rotate-[-10deg] items-center justify-center rounded-full border-2 border-emerald-200/80 bg-emerald-500/90 px-6 py-2 text-lg font-black uppercase tracking-[0.35em] text-white shadow-[0_18px_35px_rgba(16,185,129,0.45)]"
                                >
                                    LISTO
                                </div>
                            )}
                            <div className="rounded-2xl bg-black/25 p-4 sm:p-5">
                                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Informations</p>
                                <div className="mt-3 flex flex-col gap-4 text-sm sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-2">
                                        {hasClientDetails ? (
                                            <>
                                            {clientName && (
                                                <div className="flex items-center gap-2 text-white/80">
                                                    <User size={16} />
                                                    <span className="truncate" title={clientName}>{clientName}</span>
                                                </div>
                                            )}
                                            {clientPhone && (
                                                <div className="flex items-center gap-2 text-white/80">
                                                    <Phone size={16} />
                                                    <span className="truncate" title={clientPhone}>{clientPhone}</span>
                                                </div>
                                            )}
                                            {clientAddress && (
                                                <div className="flex items-center gap-2 text-white/80">
                                                    <MapPin size={16} />
                                                    <span className="truncate" title={clientAddress}>{clientAddress}</span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-white/70">Aucune information client requise.</p>
                                    )}
                                </div>
                                <div className="flex flex-col items-start gap-2 text-sm sm:min-w-[12rem] sm:items-end sm:text-right">
                                    {order.receipt_url && (
                                        <button
                                            type="button"
                                            onClick={() => setReceiptModalOpen(true)}
                                            className="group relative inline-flex flex-col items-end gap-2 focus:outline-none"
                                            aria-label="Agrandir le justificatif"
                                        >
                                            <div className="relative overflow-hidden rounded-xl border border-white/20 bg-black/40 shadow-lg">
                                                <img
                                                    src={order.receipt_url}
                                                    alt="Aperçu du justificatif"
                                                    className="h-20 w-28 object-cover transition duration-500 ease-out group-hover:scale-105 sm:h-24 sm:w-32"
                                                />
                                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition duration-300 group-hover:opacity-100">
                                                    <Receipt size={20} className="text-white" />
                                                </div>
                                            </div>
                                            <span className="text-[11px] font-medium uppercase tracking-wide text-white/70">
                                                Cliquer pour agrandir
                                            </span>
                                        </button>
                                    )}
                                    <span className="text-xs font-medium text-white/60">Mise à jour automatique toutes les 5 secondes.</span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-black/20 p-4 sm:p-5">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs font-semibold uppercase tracking-wide text-white/60">
                                <span>Résumé</span>
                                <span>Articles : {itemsCount}</span>
                            </div>
                            <div className="mt-4 max-h-56 space-y-3 overflow-y-auto pr-1 text-sm">
                                {order.items && order.items.length > 0 ? (
                                    order.items.map(item => {
                                        const isDomicilio = item.nom_produit === 'Domicilio';
                                        const isFreeShipping = isDomicilio && item.prix_unitaire === 0;
                                        const itemDescription = (() => {
                                            const potentialDescription = (item as { description?: string | null }).description;
                                            return typeof potentialDescription === 'string' && potentialDescription.trim().length > 0
                                                ? potentialDescription.trim()
                                                : null;
                                        })();

                                        return (
                                            <div key={item.id} className="rounded-xl border border-white/10 bg-black/25 p-3 sm:p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex flex-1 items-start gap-3">
                                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/90 to-red-500/90 text-sm font-bold text-white shadow-md">
                                                            {item.quantite}
                                                        </span>
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-white">{item.nom_produit}</p>
                                                            <p className="text-xs text-white/60">{formatCurrencyCOP(item.prix_unitaire)} /u</p>
                                                            {itemDescription && (
                                                                <p className="mt-1 text-xs text-white/65">{itemDescription}</p>
                                                            )}
                                                            {item.commentaire && (
                                                                <p className="mt-2 text-xs italic text-amber-200/80">“{item.commentaire}”</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right text-sm font-semibold text-white">
                                                        {isFreeShipping ? (
                                                            <span className="text-emerald-200">GRATUIT</span>
                                                        ) : (
                                                            formatCurrencyCOP(item.prix_unitaire * item.quantite)
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-white/70">Aucun article enregistré pour cette commande.</p>
                                )}
                            </div>

                            {promotionBanners ? (
                                <div className="mt-6 space-y-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Promotions appliquées</p>
                                    <div className="space-y-3">{promotionBanners}</div>
                                </div>
                            ) : null}

                            {totalDiscount > 0 && (
                                <div className="mt-5 flex items-center justify-between rounded-xl border border-emerald-300/30 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-100">
                                    <span>Réductions totales</span>
                                    <span>- {formatCurrencyCOP(totalDiscount)}</span>
                                </div>
                            )}

                            <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3 text-base font-semibold text-white">
                                <span>Total de la commande</span>
                                <span>{formatCurrencyCOP(order.total)}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            {isOrderCompleted ? (
                                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200">
                                    <CheckCircle size={16} /> Commande prête
                                </span>
                            ) : (
                                <span className="text-xs font-medium uppercase tracking-wide text-white/60">Nous préparons votre commande</span>
                            )}
                            <button
                                onClick={isOrderCompleted ? onNewOrderClick : undefined}
                                disabled={!isOrderCompleted}
                                className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition ${
                                    isOrderCompleted
                                        ? 'bg-white text-amber-600 shadow-lg hover:bg-white/90'
                                        : 'cursor-not-allowed bg-white/10 text-white/50'
                                }`}
                            >
                                Revenir au menu
                            </button>
                        </div>
                    </div>
                </div>
                </div>
                <Modal
                    isOpen={isReceiptModalOpen}
                    onClose={() => setReceiptModalOpen(false)}
                    title="Justificatif de Paiement"
                >
                    {order.receipt_url ? (
                        <img src={order.receipt_url} alt="Justificatif" className="h-auto w-full rounded-md" />
                    ) : (
                        <p>Aucun justificatif fourni.</p>
                    )}
                </Modal>
            </div>
        );
    }

    return (
        <div className={containerClasses}>
            <div className={contentClasses}>
                <h2 className={`text-3xl font-bold text-center mb-2 ${variant === 'hero' ? 'text-white' : 'text-gray-800'}`}>Suivi de votre commande</h2>
                <p className={`text-center font-semibold mb-8 ${variant === 'hero' ? 'text-white' : 'text-gray-500'}`}>Commande #{order.id.slice(-6)}</p>

                <div className="mb-8">
                    <div
                        className={`flex items-start sm:items-center justify-between gap-3 sm:gap-4 px-2 ${
                            steps.length > 3 ? 'flex-wrap sm:flex-nowrap' : ''
                        }`}
                    >
                        {steps.map((step, index) => {
                            const isActive = index === currentStep;
                            const isFinalStep = index === steps.length - 1;
                            const isCompleted = index < currentStep || (isFinalStep && isOrderCompleted);

                            return (
                                <div key={step.name} className="flex flex-1 items-center gap-2 sm:gap-4">
                                    <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
                                        <p
                                            className={`text-xs sm:text-sm font-semibold ${
                                                isCompleted || isActive ? 'text-gray-900' : 'text-gray-400'
                                            }`}
                                        >
                                            {step.name}
                                        </p>
                                        <div
                                            className={`relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-4 transition-all duration-500 ${
                                                isCompleted
                                                    ? 'bg-green-500 border-green-300'
                                                    : isActive
                                                        ? 'bg-blue-600 border-blue-400 animate-pulse'
                                                        : 'bg-gray-400 border-gray-300'
                                            }`}
                                        >
                                            <step.icon className="h-8 w-8 text-white sm:h-9 sm:w-9" />
                                            {isCompleted && (
                                                <CheckCircle className="absolute -top-2 -right-2 h-5 w-5 text-emerald-100 drop-shadow" />
                                            )}
                                        </div>
                                        <p
                                            className={`text-[11px] sm:text-xs leading-snug ${
                                                isCompleted || isActive ? 'text-gray-600' : 'text-gray-400'
                                            }`}
                                        >
                                            {step.description}
                                        </p>
                                    </div>
                                    {index < steps.length - 1 && (
                                        <div className="flex flex-1 items-center" aria-hidden>
                                            <div
                                                className={`tracker-gauge-wrapper ${
                                                    variant === 'hero' ? 'tracker-gauge-hero' : 'tracker-gauge-default'
                                                } ${isCompleted ? 'tracker-gauge-wrapper-complete' : ''}`}
                                            >
                                                <span
                                                    className={`tracker-gauge-fill ${
                                                        isCompleted
                                                            ? 'tracker-gauge-fill-complete'
                                                            : isActive
                                                                ? 'tracker-gauge-fill-active'
                                                                : 'tracker-gauge-fill-idle'
                                                    }`}
                                                />
                                                {(isActive || isCompleted) && <span className="tracker-gauge-glow" />}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <style>{`
                    .tracker-progress-container {
                        position: relative;
                        height: 12px;
                        border-radius: 9999px;
                        overflow: hidden;
                        box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.12);
                    }

                    .tracker-progress-default {
                        background: linear-gradient(90deg, rgba(229, 231, 235, 0.55), rgba(209, 213, 219, 0.35));
                    }

                    .tracker-progress-hero {
                        background: linear-gradient(90deg, rgba(255, 255, 255, 0.25), rgba(148, 163, 184, 0.15));
                        box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.25);
                    }

                    .tracker-progress-fill {
                        position: absolute;
                        inset: 0;
                        width: 0;
                        display: flex;
                        align-items: center;
                        justify-content: flex-end;
                        background: linear-gradient(90deg, rgba(249, 168, 38, 0.65), rgba(239, 68, 68, 0.95));
                        border-radius: inherit;
                        animation: tracker-progress-advance 1.2s ease forwards;
                    }

                    .tracker-progress-fill::after {
                        content: '';
                        position: absolute;
                        inset: 0;
                        background: linear-gradient(90deg, rgba(255, 255, 255, 0.15), transparent 55%);
                        mix-blend-mode: screen;
                    }

                    .tracker-progress-glow {
                        position: absolute;
                        right: -14px;
                        top: 50%;
                        width: 28px;
                        height: 28px;
                        transform: translateY(-50%);
                        background: radial-gradient(circle at center, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0));
                        pointer-events: none;
                    }

                    @keyframes tracker-progress-advance {
                        0% {
                            width: 0;
                        }
                        100% {
                            width: var(--tracker-progress-target);
                        }
                    }

                    .tracker-gauge-wrapper {
                        position: relative;
                        height: 10px;
                        border-radius: 9999px;
                        overflow: hidden;
                        box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.12);
                        transition: box-shadow 0.3s ease;
                    }

                    .tracker-gauge-wrapper-complete {
                        box-shadow: inset 0 1px 3px rgba(21, 128, 61, 0.35);
                    }

                    .tracker-gauge-default {
                        background: linear-gradient(90deg, rgba(229, 231, 235, 0.45), rgba(209, 213, 219, 0.25));
                    }

                    .tracker-gauge-hero {
                        background: linear-gradient(90deg, rgba(255, 255, 255, 0.22), rgba(148, 163, 184, 0.12));
                        box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.4);
                    }

                    .tracker-gauge-fill {
                        position: absolute;
                        inset: 0;
                        transform-origin: left;
                        background-size: 250% 100%;
                        border-radius: inherit;
                    }

                    .tracker-gauge-fill-idle {
                        transform: scaleX(0);
                        background: linear-gradient(90deg, rgba(148, 163, 184, 0.25), rgba(148, 163, 184, 0.15));
                    }

                    .tracker-gauge-fill-active {
                        animation: tracker-gauge-fill-grow 1.2s ease forwards, tracker-gauge-cycle 3.2s linear infinite;
                        background: linear-gradient(90deg, #f97316, #ef4444, #facc15, #f97316);
                    }

                    .tracker-gauge-fill-complete {
                        transform: scaleX(1);
                        animation: tracker-gauge-cycle 4.2s linear infinite;
                        background: linear-gradient(90deg, #22c55e, #0ea5e9, #f97316, #22c55e);
                    }

                    .tracker-gauge-glow {
                        position: absolute;
                        inset: -6px;
                        background: radial-gradient(circle at center, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0));
                        animation: tracker-gauge-glow 1.6s ease-in-out infinite;
                        pointer-events: none;
                    }

                    @keyframes tracker-gauge-fill-grow {
                        0% { transform: scaleX(0); }
                        100% { transform: scaleX(1); }
                    }

                    @keyframes tracker-gauge-cycle {
                        0% { background-position: 0% 50%; }
                        100% { background-position: 200% 50%; }
                    }

                    @keyframes tracker-gauge-glow {
                        0%, 100% { opacity: 0.45; }
                        50% { opacity: 0.85; }
                    }

                    .promo-banner {
                        position: relative;
                        isolation: isolate;
                        animation: promo-banner-blink 2.2s ease-in-out infinite;
                    }

                    .promo-banner::before {
                        content: '';
                        position: absolute;
                        inset: 0;
                        background: linear-gradient(120deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0));
                        opacity: 0.45;
                        pointer-events: none;
                    }

                    .promo-banner > * {
                        position: relative;
                        z-index: 1;
                    }

                    @keyframes promo-banner-blink {
                        0%, 100% {
                            transform: translateY(0) scale(1);
                            filter: brightness(1);
                            opacity: 0.85;
                        }
                        45% {
                            transform: translateY(-2px) scale(1.02);
                            filter: brightness(1.18);
                            opacity: 1;
                        }
                        60% {
                            transform: translateY(0) scale(0.99);
                            filter: brightness(0.92);
                            opacity: 0.55;
                        }
                    }

                    .stamp-container {
                        position: relative;
                        width: 180px;
                        height: 180px;
                        animation: stamp-appear 0.5s ease-out;
                    }
                    
                    @keyframes stamp-appear {
                        0% {
                            transform: scale(0) rotate(-45deg);
                            opacity: 0;
                        }
                        60% {
                            transform: scale(1.1) rotate(0deg);
                        }
                        100% {
                            transform: scale(1) rotate(0deg);
                            opacity: 1;
                        }
                    }
                    
                    .stamp-border {
                        width: 100%;
                        height: 100%;
                        border: 4px solid #dc2626;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: rgba(220, 38, 38, 0.05);
                        position: relative;
                        box-shadow: 0 0 0 2px #dc2626;
                    }
                    
                    .stamp-border::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        border-radius: 50%;
                        background: repeating-linear-gradient(
                            45deg,
                            transparent,
                            transparent 2px,
                            rgba(220, 38, 38, 0.03) 2px,
                            rgba(220, 38, 38, 0.03) 4px
                        );
                    }
                    
                    .stamp-inner {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                        z-index: 1;
                    }
                    
                    .stamp-text {
                        font-family: 'Arial Black', 'Arial Bold', sans-serif;
                        font-weight: 900;
                        color: #dc2626;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        line-height: 1;
                        text-shadow: 
                            1px 1px 0 rgba(220, 38, 38, 0.3),
                            -1px -1px 0 rgba(220, 38, 38, 0.3);
                    }
                    
                    .stamp-text:first-child {
                        font-size: 20px;
                        margin-bottom: 6px;
                    }
                    
                    .stamp-text-large {
                        font-size: 42px;
                        font-weight: 900;
                    }
                    
                    /* Effet de texture grunge */
                    .stamp-border::after {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        border-radius: 50%;
                        background-image: 
                            radial-gradient(circle at 20% 30%, transparent 0%, transparent 2%, rgba(220, 38, 38, 0.1) 2%, transparent 3%),
                            radial-gradient(circle at 80% 70%, transparent 0%, transparent 2%, rgba(220, 38, 38, 0.1) 2%, transparent 3%),
                            radial-gradient(circle at 40% 80%, transparent 0%, transparent 1%, rgba(220, 38, 38, 0.1) 1%, transparent 2%),
                            radial-gradient(circle at 60% 20%, transparent 0%, transparent 1%, rgba(220, 38, 38, 0.1) 1%, transparent 2%);
                        opacity: 0.8;
                    }
                `}</style>
                
                <div className={detailContainerClasses}>
                    {/* Tampon PEDIDO LISTO */}
                    {isOrderCompleted && (
                        <div className="absolute top-4 right-4 z-10 pointer-events-none">
                            <div className="relative" style={{ transform: 'rotate(15deg)' }}>
                                <div className="stamp-container">
                                    <div className="stamp-border">
                                        <div className="stamp-inner">
                                            <span className="stamp-text">PEDIDO</span>
                                            <span className="stamp-text stamp-text-large">LISTO</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <h3 className={`mt-10 text-xl font-bold ${variant === 'hero' ? 'text-white' : 'text-gray-800'}`}>Résumé de la commande</h3>

                    {isTakeawayOrder && hasClientDetails && (
                        <div
                            className={`mt-6 rounded-xl border p-4 ${
                                variant === 'hero'
                                    ? 'border-white/30 bg-white/10 backdrop-blur text-white'
                                    : 'border-gray-200 bg-gray-50 text-gray-700'
                            }`}
                        >
                            <p className={`mb-3 text-sm font-semibold uppercase tracking-wide ${variant === 'hero' ? 'text-gray-100' : 'text-gray-600'}`}>
                                Informations Client
                            </p>
                            <div className="space-y-2 text-sm">
                                {clientName && (
                                    <div className="flex items-center">
                                        <User size={16} className={`mr-2 ${variant === 'hero' ? 'text-white/80' : 'text-gray-500'}`} />
                                        <span className="font-medium whitespace-nowrap truncate" title={clientName}>{clientName}</span>
                                    </div>
                                )}
                                {clientPhone && (
                                    <div className="flex items-center">
                                        <Phone size={16} className={`mr-2 ${variant === 'hero' ? 'text-white/80' : 'text-gray-500'}`} />
                                        <span className="whitespace-nowrap" title={clientPhone}>{clientPhone}</span>
                                    </div>
                                )}
                                {clientAddress && (
                                    <div className="flex items-center">
                                        <MapPin size={16} className={`mr-2 ${variant === 'hero' ? 'text-white/80' : 'text-gray-500'}`} />
                                        <span className="truncate" title={clientAddress}>{clientAddress}</span>
                                    </div>
                                )}
                            </div>
                            {order.receipt_url && (
                                <button
                                    onClick={() => setReceiptModalOpen(true)}
                                    className={`mt-4 inline-flex items-center gap-2 text-sm font-semibold underline-offset-2 hover:underline ${variant === 'hero' ? 'text-white' : 'text-blue-500'}`}
                                >
                                    <Receipt size={16} /> Voir le justificatif
                                </button>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        {order.items && order.items.length > 0 ? (
                            order.items.map(item => {
                                const isDomicilio = item.nom_produit === 'Domicilio';
                                const isFreeShipping = isDomicilio && item.prix_unitaire === 0;
                                const potentialDescription = (item as { description?: string | null }).description;
                                const itemDescription = typeof potentialDescription === 'string' && potentialDescription.trim().length > 0
                                    ? potentialDescription.trim()
                                    : null;
                                const itemComment = typeof item.commentaire === 'string' && item.commentaire.trim().length > 0
                                    ? item.commentaire.trim()
                                    : null;

                                return (
                                    <div
                                        key={item.id}
                                        className={`flex flex-col gap-2 rounded-lg border-b border-dashed border-gray-200/70 pb-3 pt-2 last:border-b-0 last:pb-0 ${
                                            variant === 'hero' ? 'text-gray-200' : 'text-gray-600'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <p className="text-[clamp(0.95rem,1.8vw,1.1rem)] font-semibold leading-snug text-balance">
                                                    {item.quantite}x {item.nom_produit}
                                                </p>
                                                {itemDescription && (
                                                    <p className="mt-1 text-sm text-gray-500">
                                                        {itemDescription}
                                                    </p>
                                                )}
                                                {itemComment && (
                                                    <p className="mt-1 text-sm italic text-amber-600">
                                                        “{itemComment}”
                                                    </p>
                                                )}
                                            </div>
                                            <div className="whitespace-nowrap text-right text-sm font-semibold">
                                                {isFreeShipping ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xs text-gray-400 line-through">{formatCurrencyCOP(8000)}</span>
                                                        <span className="text-sm font-bold text-green-600">GRATIS</span>
                                                    </div>
                                                ) : (
                                                    <span>{formatCurrencyCOP(item.prix_unitaire * item.quantite)}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className={`${variant === 'hero' ? 'text-gray-300' : 'text-gray-600'}`}>Aucun article enregistré pour cette commande.</p>
                        )}
                    </div>

                    {isTakeawayOrder && promotionsSectionContent}

                    {/* Affichage du subtotal, des promotions et des codes promo */}
                    {!isTakeawayOrder && promotionsSectionContent}

                    {totalDiscount > 0 && (
                        <div className={`mt-4 flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-semibold ${
                            variant === 'hero'
                                ? 'border-emerald-300/30 bg-emerald-500/15 text-emerald-100'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}>
                            <span>Réductions totales</span>
                            <span>-{formatCurrencyCOP(totalDiscount)}</span>
                        </div>
                    )}

                    <div className={`flex justify-between font-bold text-lg border-t pt-2 ${variant === 'hero' ? 'text-white border-gray-500' : 'text-gray-800'}`}>
                        <span>Total</span>
                        <span>{formatCurrencyCOP(order.total)}</span>
                    </div>

                    {!isTakeawayOrder && hasClientDetails && (
                        <div className={`border-t pt-4 space-y-2 ${variant === 'hero' ? 'border-gray-500' : ''}`}>
                            <h3 className={`text-xl font-bold ${variant === 'hero' ? 'text-white' : 'text-gray-800'} mb-2`}>Informations Client</h3>
                            {clientName && (
                                <div className={`flex items-center ${variant === 'hero' ? 'text-gray-200' : 'text-gray-700'}`}>
                                    <User size={16} className="mr-2" />
                                    <span className="whitespace-nowrap truncate" title={clientName}>{clientName}</span>
                                </div>
                            )}
                            {clientPhone && (
                                <div className={`flex items-center ${variant === 'hero' ? 'text-gray-200' : 'text-gray-700'}`}>
                                    <Phone size={16} className="mr-2" />
                                    <span className="whitespace-nowrap" title={clientPhone}>{clientPhone}</span>
                                </div>
                            )}
                            {clientAddress && (
                                <div className={`flex items-center ${variant === 'hero' ? 'text-gray-200' : 'text-gray-700'}`}>
                                    <MapPin size={16} className="mr-2" />
                                    <span className="truncate" title={clientAddress}>{clientAddress}</span>
                                </div>
                            )}
                            {order.receipt_url && (
                                <button onClick={() => setReceiptModalOpen(true)} className="flex items-center text-blue-400 hover:underline"><Receipt size={16} className="mr-2"/>Voir le justificatif</button>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-8 text-center space-y-4">
                    {isOrderCompleted && (
                        <div className="flex justify-center">
                            <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                                <CheckCircle size={16} /> Pedido listo
                            </span>
                        </div>
                    )}
                    <div className="flex flex-col space-y-4">
                        <p className={`text-sm ${variant === 'hero' ? 'text-gray-300' : 'text-gray-600'}`}>
                            Le statut de votre commande est mis à jour automatiquement.
                        </p>
                        <button 
                            onClick={isOrderCompleted ? onNewOrderClick : undefined} 
                            disabled={!isOrderCompleted}
                            className={`font-bold py-3 px-6 rounded-lg transition ${
                                isOrderCompleted 
                                    ? `${variant === 'hero' ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-brand-primary text-brand-secondary hover:bg-brand-primary-dark'} cursor-pointer` 
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                            }`}
                        >
                            Volver
                        </button>
                    </div>
                </div>
            </div>
            <Modal
                isOpen={isReceiptModalOpen}
                onClose={() => setReceiptModalOpen(false)}
                title="Justificatif de Paiement"
            >
                {order.receipt_url ? (
                    <img src={order.receipt_url} alt="Justificatif" className="w-full h-auto rounded-md" />
                ) : (
                    <p>Aucun justificatif fourni.</p>
                )}
            </Modal>
        </div>
    );
};

export default CustomerOrderTracker;
