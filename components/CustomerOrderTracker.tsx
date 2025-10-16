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
    const [progressAnimationKey, setProgressAnimationKey] = useState(0);

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

    const nextStepLabel = useMemo(() => {
        if (currentStep < 0) {
            return steps[0]?.name ?? '';
        }
        if (currentStep >= steps.length - 1) {
            return steps[steps.length - 1]?.name ?? '';
        }
        return steps[currentStep + 1]?.name ?? '';
    }, [currentStep, steps]);

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
        : "flex-1 flex flex-col justify-center items-center text-center text-white p-4 bg-black bg-opacity-60 w-full";

    const contentClasses = variant === 'page'
        ? "bg-white/95 p-6 rounded-xl shadow-2xl max-w-2xl mx-auto"
        : "max-w-4xl mx-auto";

    const detailContainerClasses = `${variant === 'hero' ? 'bg-black/20 p-4 rounded-lg' : 'border-t pt-6 mt-6'} space-y-4 relative ${variant === 'page' ? 'md:w-1/2 md:mx-auto' : 'w-full'}`;

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
    const promotionsSection = hasAppliedPromotions ? (
        <div className="space-y-2">
            <p className={`text-sm font-semibold ${variant === 'hero' ? 'text-green-300' : 'text-green-700'}`}>
                Promotions appliquées
            </p>
            <div className="space-y-3">
                {order.applied_promotions!.map((promotion, index) => {
                    const promoConfig = typeof promotion.config === 'object' && promotion.config !== null
                        ? (promotion.config as Record<string, unknown>)
                        : undefined;
                    const promoCode = promoConfig?.promo_code as string | undefined;
                    const visuals = promotion.visuals || null;
                    const bannerImage = visuals?.banner_image || visuals?.banner_url;
                    const bannerText = visuals?.banner_text || undefined;
                    const discountAmount = promotion.discount_amount || 0;
                    const scheme = promotionColorSchemes[index % promotionColorSchemes.length];

                    return (
                        <div
                            key={`${promotion.promotion_id}-${promotion.name}`}
                            className={`promo-banner flex w-full items-center gap-4 overflow-hidden rounded-2xl border bg-gradient-to-r p-3 sm:p-4 text-white shadow-lg ${scheme.gradient} ${scheme.border} ${scheme.glow}`}
                            aria-label={`Promotion ${promotion.name}`}
                        >
                            <div className="relative h-8 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-white/15">
                                {bannerImage ? (
                                    <>
                                        <img
                                            src={bannerImage}
                                            alt={bannerText || promotion.name}
                                            className="h-full w-full object-cover opacity-95"
                                        />
                                        {bannerText && (
                                            <div className="absolute bottom-1 left-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                                                {bannerText}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] font-semibold leading-tight text-white">
                                        {promotion.name}
                                    </div>
                                )}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col text-left">
                                {(!bannerImage || !bannerText) && (
                                    <span
                                        className="text-sm font-semibold tracking-wide text-white whitespace-nowrap truncate"
                                        title={promotion.name}
                                    >
                                        {promotion.name}
                                    </span>
                                )}
                                {promoCode && (
                                    <span className="text-[11px] font-medium uppercase tracking-wide text-white/85 whitespace-nowrap">
                                        Code: {promoCode}
                                    </span>
                                )}
                            </div>
                            <div className="text-right whitespace-nowrap">
                                <span className="block text-sm font-bold text-white">
                                    -{formatCurrencyCOP(discountAmount)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    ) : null;

    return (
        <div className={containerClasses}>
            <div className={contentClasses}>
                <h2 className={`text-3xl font-bold text-center mb-2 ${variant === 'hero' ? 'text-white' : 'text-gray-800'}`}>Suivi de votre commande</h2>
                <p className={`text-center font-semibold mb-8 ${variant === 'hero' ? 'text-gray-300' : 'text-gray-500'}`}>Commande #{order.id.slice(-6)}</p>

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
                                <React.Fragment key={step.name}>
                                    <div className="flex flex-col items-center text-center">
                                        <div
                                            className={`flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 transition-all duration-500 ${
                                                isCompleted
                                                    ? 'bg-green-500 border-green-300'
                                                    : isActive
                                                        ? 'bg-blue-600 border-blue-400 animate-pulse'
                                                        : 'bg-gray-400 border-gray-300'
                                            }`}
                                        >
                                            <step.icon className={`w-6 h-6 sm:w-8 sm:h-8 ${variant === 'hero' ? 'text-white' : 'text-white'}`} />
                                        </div>
                                        <p
                                            className={`mt-2 text-xs sm:text-sm font-semibold ${
                                                isCompleted || isActive
                                                    ? `${variant === 'hero' ? 'text-white' : 'text-gray-800'}`
                                                    : `${variant === 'hero' ? 'text-gray-400' : 'text-gray-400'}`
                                            }`}
                                        >
                                            {step.name}
                                        </p>
                                        <p
                                            className={`mt-1 text-[11px] sm:text-xs leading-snug ${
                                                isCompleted || isActive
                                                    ? `${variant === 'hero' ? 'text-gray-200' : 'text-gray-600'}`
                                                    : `${variant === 'hero' ? 'text-gray-400' : 'text-gray-400'}`
                                            }`}
                                        >
                                            {step.description}
                                        </p>
                                    </div>
                                {index < steps.length - 1 && (
                                    <div className="flex-1 flex items-center mx-2 sm:mx-4" aria-hidden>
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
                            </React.Fragment>
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
                                
                                return (
                                    <div key={item.id} className={`flex justify-between items-center ${variant === 'hero' ? 'text-gray-200' : 'text-gray-600'}`}>
                                        <span className="text-[clamp(0.95rem,1.8vw,1.1rem)] leading-snug break-words text-balance whitespace-normal [hyphens:auto]">
                                            {item.quantite}x {item.nom_produit}
                                        </span>
                                        {isFreeShipping ? (
                                            <div className="flex items-center space-x-2">
                                                <span className={`text-sm ${variant === 'hero' ? 'text-gray-400' : 'text-gray-400'} line-through`}>{formatCurrencyCOP(8000)}</span>
                                                <span className="text-sm font-bold text-green-600">GRATIS</span>
                                            </div>
                                        ) : (
                                            <span>{formatCurrencyCOP(item.prix_unitaire * item.quantite)}</span>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <p className={`${variant === 'hero' ? 'text-gray-300' : 'text-gray-600'}`}>Aucun article enregistré pour cette commande.</p>
                        )}
                    </div>

                    {isTakeawayOrder && promotionsSection}

                    {/* Affichage du subtotal, des promotions et des codes promo */}
                    {(order.subtotal !== undefined && order.subtotal !== null) && (
                        <div className={`flex justify-between ${variant === 'hero' ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span>Subtotal</span>
                            <span>{formatCurrencyCOP(order.subtotal)}</span>
                        </div>
                    )}

                    {!isTakeawayOrder && promotionsSection}

                    {totalDiscount > 0 && (
                        <div className={`flex justify-between ${variant === 'hero' ? 'text-green-200' : 'text-green-700'}`}>
                            <span className="text-sm font-semibold">Réductions totales</span>
                            <span className="text-sm font-semibold">-{formatCurrencyCOP(totalDiscount)}</span>
                        </div>
                    )}

                    {totalDiscount > 0 && order.subtotal !== undefined && order.subtotal !== null && (
                        <div className={`flex justify-between ${variant === 'hero' ? 'text-gray-200' : 'text-gray-600'}`}>
                            <span>Sous-total après réductions</span>
                            <span>{formatCurrencyCOP(subtotalAfterDiscounts)}</span>
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
