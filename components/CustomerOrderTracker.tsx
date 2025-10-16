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

    const steps = [
        { name: 'Enviado', icon: FileText, description: 'Commande transmise et en attente de validation.' },
        { name: 'Validado', icon: CheckCircle, description: 'La commande est validée par l’équipe.' },
        { name: 'En preparacion', icon: ChefHat, description: 'La cuisine prépare activement votre commande.' },
        { name: 'Listo', icon: PackageCheck, description: 'La commande est prête pour la remise ou la livraison.' }
    ];

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
      : "flex-1 flex flex-col justify-center items-center text-center text-white p-4 bg-black bg-opacity-60 w-full";
      
    const contentClasses = variant === 'page'
      ? "bg-white/95 p-6 rounded-xl shadow-2xl max-w-2xl mx-auto"
      : "max-w-4xl mx-auto";

    const detailContainerClasses =
        variant === 'hero'
            ? 'relative w-full space-y-4 rounded-2xl border border-white/15 bg-black/25 p-6 shadow-[0_25px_50px_-25px_rgba(0,0,0,0.65)] backdrop-blur-md'
            : 'relative w-full space-y-4 rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-xl';
    const gaugeBaseClass = variant === 'hero' ? 'bg-white/18' : 'bg-gray-200';
    const gaugeActiveFillClass = 'bg-gradient-to-r from-[#FF7A18] via-[#FF3D00] to-[#C81D11] shadow-[0_0_18px_rgba(255,90,40,0.45)]';
    const gaugeCompletedFillClass = 'bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.35)]';

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

    return (
        <>
        <div className={containerClasses}>
            <div className={contentClasses}>
                <h2 className={`text-3xl font-bold text-center mb-2 ${variant === 'hero' ? 'text-white' : 'text-gray-800'}`}>Suivi de votre commande</h2>
                <p className={`text-center font-semibold mb-8 ${variant === 'hero' ? 'text-gray-300' : 'text-gray-500'}`}>Commande #{order.id.slice(-6)}</p>

                <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
                    <div>
                        <div className="mb-10 flex items-center px-2">
                            {steps.map((step, index) => {
                                const isActive = index === currentStep;
                                const isFinalStep = index === steps.length - 1;
                                const isCompleted = index < currentStep || (isFinalStep && isOrderCompleted);

                                return (
                                    <React.Fragment key={step.name}>
                                        <div className="flex flex-col items-center text-center">
                                            <div
                                                className={`flex h-12 w-12 items-center justify-center rounded-full border-4 transition-all duration-500 sm:h-16 sm:w-16 ${
                                                    isCompleted
                                                        ? 'border-emerald-300 bg-emerald-500 shadow-inner shadow-emerald-700/40'
                                                        : isActive
                                                            ? 'border-transparent bg-gradient-to-r from-[#FF7A18] via-[#FF3D00] to-[#C81D11] shadow-lg shadow-[#FF3D00]/45'
                                                            : variant === 'hero'
                                                                ? 'border-white/20 bg-white/15'
                                                                : 'border-gray-300 bg-gray-200'
                                                }`}
                                            >
                                                <step.icon
                                                    className={`h-6 w-6 sm:h-8 sm:w-8 ${
                                                        isCompleted || isActive
                                                            ? 'text-white'
                                                            : variant === 'hero'
                                                                ? 'text-white/80'
                                                                : 'text-gray-600'
                                                    }`}
                                                />
                                            </div>
                                            <p className={`mt-2 text-xs sm:text-sm font-semibold ${
                                                isCompleted || isActive
                                                    ? `${variant === 'hero' ? 'text-white' : 'text-gray-800'}`
                                                    : `${variant === 'hero' ? 'text-gray-400' : 'text-gray-400'}`
                                            }`}>{step.name}</p>
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
                                            <div className="mx-2 flex-1 sm:mx-4" aria-hidden>
                                                <div className="relative h-2 overflow-hidden rounded-full">
                                                    <div className={`absolute inset-0 rounded-full ${gaugeBaseClass}`} />
                                                    <div
                                                        className={`absolute inset-0 rounded-full origin-left transition-all duration-700 ease-out ${
                                                            isCompleted
                                                                ? gaugeCompletedFillClass
                                                                : isActive
                                                                    ? gaugeActiveFillClass
                                                                    : 'opacity-0'
                                                        }`}
                                                        style={{
                                                            transform: `scaleX(${isCompleted || isActive ? 1 : 0})`,
                                                            opacity: isCompleted || isActive ? 1 : 0,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                        <div className="mt-10 text-center space-y-4">
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
                                    className={`rounded-lg py-3 px-6 font-bold transition ${
                                        isOrderCompleted
                                            ? `${
                                                  variant === 'hero'
                                                      ? 'bg-white/90 text-gray-900 hover:bg-white'
                                                      : 'bg-gradient-to-r from-[#FF7A18] via-[#FF3D00] to-[#C81D11] text-white shadow-lg shadow-[#FF3D00]/35 hover:from-[#FF7A18]/90 hover:via-[#FF3D00]/90 hover:to-[#C81D11]/90'
                                              }`
                                            : 'cursor-not-allowed bg-gray-300 text-gray-500 opacity-50'
                                    }`}
                                >
                                    Volver
                                </button>
                            </div>
                        </div>
                    </div>
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
                        <h3 className={`text-xl font-bold ${variant === 'hero' ? 'text-white' : 'text-gray-800'}`}>Résumé de la commande</h3>
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
                        
                        {/* Affichage du subtotal, des promotions et des codes promo */}
                        {(order.subtotal !== undefined && order.subtotal !== null) && (
                            <div className={`flex justify-between ${variant === 'hero' ? 'text-gray-300' : 'text-gray-600'}`}>
                                <span>Subtotal</span>
                                <span>{formatCurrencyCOP(order.subtotal)}</span>
                            </div>
                        )}

                        {hasAppliedPromotions && (
                            <div className="space-y-2">
                                <p className={`text-sm font-semibold ${variant === 'hero' ? 'text-green-300' : 'text-green-700'}`}>
                                    Promotions appliquées
                                </p>
                                <div className="space-y-3">
                                    {order.applied_promotions!.map(promotion => {
                                        const promoConfig = typeof promotion.config === 'object' && promotion.config !== null
                                            ? (promotion.config as Record<string, unknown>)
                                            : undefined;
                                        const promoCode = promoConfig?.promo_code as string | undefined;
                                        const visuals = promotion.visuals || null;
                                        const bannerImage = visuals?.banner_image || visuals?.banner_url;
                                        const bannerText = visuals?.banner_text || undefined;
                                        const discountAmount = promotion.discount_amount || 0;

                                        return (
                                            <div
                                                key={`${promotion.promotion_id}-${promotion.name}`}
                                                className={`flex items-center gap-3 overflow-hidden rounded-xl border ${
                                                    variant === 'hero'
                                                        ? 'border-white/20 bg-white/10 backdrop-blur-sm'
                                                        : 'border-green-200 bg-green-50'
                                                } p-2 sm:p-3`}
                                                aria-label={`Promotion ${promotion.name}`}
                                            >
                                                <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-lg">
                                                    {bannerImage ? (
                                                        <>
                                                            <img
                                                                src={bannerImage}
                                                                alt={bannerText || promotion.name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                            {bannerText && (
                                                                <div className="absolute bottom-1 left-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                                                                    {bannerText}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div
                                                            className={`flex h-full w-full items-center justify-center px-2 text-center text-[11px] font-semibold leading-tight ${
                                                                variant === 'hero' ? 'bg-white/20 text-white' : 'bg-green-100 text-green-800'
                                                            }`}
                                                        >
                                                            {promotion.name}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-1 flex-col text-left">
                                                    {(!bannerImage || !bannerText) && (
                                                        <span className={`text-sm font-semibold ${variant === 'hero' ? 'text-white' : 'text-gray-800'}`}>
                                                            {promotion.name}
                                                        </span>
                                                    )}
                                                    {promoCode && (
                                                        <span className={`text-[11px] font-medium uppercase tracking-wide ${variant === 'hero' ? 'text-green-200' : 'text-green-600'}`}>
                                                            Code: {promoCode}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <span className={`block text-sm font-bold ${variant === 'hero' ? 'text-green-200' : 'text-green-700'}`}>
                                                        -{formatCurrencyCOP(discountAmount)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

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

                        <div className={`border-t pt-4 space-y-2 ${variant === 'hero' ? 'border-gray-500' : ''}`}>
                            <h3 className={`text-xl font-bold ${variant === 'hero' ? 'text-white' : 'text-gray-800'} mb-2`}>Informations Client</h3>
                            <div className={`flex items-center ${variant === 'hero' ? 'text-gray-200' : 'text-gray-700'}`}><User size={16} className="mr-2"/>{order.clientInfo?.nom}</div>
                            <div className={`flex items-center ${variant === 'hero' ? 'text-gray-200' : 'text-gray-700'}`}><Phone size={16} className="mr-2"/>{order.clientInfo?.telephone}</div>
                            {order.clientInfo?.adresse && (
                                <div className={`flex items-center ${variant === 'hero' ? 'text-gray-200' : 'text-gray-700'}`}><MapPin size={16} className="mr-2"/>{order.clientInfo?.adresse}</div>
                            )}
                            {order.receipt_url && (
                                <button onClick={() => setReceiptModalOpen(true)} className="flex items-center text-blue-400 hover:underline"><Receipt size={16} className="mr-2"/>Voir le justificatif</button>
                            )}
                        </div>
                    </div>


                </div>
                <style>{`
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

            </div>
        </div>
        <Modal isOpen={isReceiptModalOpen} onClose={() => setReceiptModalOpen(false)} title="Justificatif de Paiement">
            {order.receipt_url ? 
                <img src={order.receipt_url} alt="Justificatif" className="w-full h-auto rounded-md" /> :
                <p>Aucun justificatif fourni.</p>
            }
        </Modal>
        </>
    );
};

export default CustomerOrderTracker;
