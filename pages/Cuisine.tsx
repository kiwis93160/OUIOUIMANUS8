import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ChefHat, Clock, Flame } from 'lucide-react';
import { api } from '../services/api';
import { KitchenTicket as KitchenTicketOrder } from '../types';
import { useAuth } from '../contexts/AuthContext';
import OrderTimer from '../components/OrderTimer';
import { getOrderUrgencyStyles } from '../utils/orderUrgency';

const computeNameSizeClass = (label: string) => {
    const trimmedLength = label.trim().length;

    if (trimmedLength <= 10) {
        return 'text-[clamp(1.5rem,3.2vw,2rem)]';
    }

    if (trimmedLength <= 16) {
        return 'text-[clamp(1.3rem,3vw,1.75rem)]';
    }

    if (trimmedLength <= 24) {
        return 'text-[clamp(1.15rem,2.8vw,1.5rem)]';
    }

    return 'text-[clamp(1rem,2.6vw,1.3rem)]';
};

const KitchenTicketCard: React.FC<{ order: KitchenTicketOrder; onReady: (orderId: string, ticketTimestamp?: number) => void; canMarkReady: boolean }> = ({ order, onReady, canMarkReady }) => {

    const urgencyStyles = getOrderUrgencyStyles(order.date_envoi_cuisine || Date.now());
    const groupedItems = useMemo(() => {
        type GroupedItem = {
            key: string;
            nom_produit: string;
            quantite: number;
            commentaire?: string;
        };

        const items: GroupedItem[] = [];
        const groupIndex = new Map<string, number>();

        order.items.forEach((item) => {
            const trimmedComment = item.commentaire?.trim();
            const commentKey = trimmedComment || 'no_comment';
            const baseKey = `${item.produitRef}::${commentKey}`;

            if (trimmedComment) {
                items.push({
                    key: `${baseKey}::${item.id}`,
                    nom_produit: item.nom_produit,
                    quantite: item.quantite,
                    commentaire: trimmedComment,
                });
                return;
            }

            const existingIndex = groupIndex.get(baseKey);

            if (existingIndex !== undefined) {
                items[existingIndex].quantite += item.quantite;
                return;
            }

            groupIndex.set(baseKey, items.length);
            items.push({
                key: baseKey,
                nom_produit: item.nom_produit,
                quantite: item.quantite,
            });
        });

        return items;
    }, [order.items]);

    const totalProducts = useMemo(
        () => order.items.reduce((total, item) => total + item.quantite, 0),
        [order.items],
    );

    const sentAt = new Date(order.date_envoi_cuisine || Date.now());
    const sentAtFormatted = sentAt.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    const displayName = order.table_nom || `Para llevar #${order.id.slice(-4)}`;
    const nameClass = computeNameSizeClass(displayName);

    return (
        <div className={`flex h-full min-w-[22rem] flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-white to-gray-50 shadow-2xl transition-all duration-300 hover:shadow-3xl hover:-translate-y-1 ${urgencyStyles.border} border-2`}>
            {/* Header modernisé avec gradient */}
            <div className={`relative overflow-hidden px-6 py-5 ${urgencyStyles.accent}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent"></div>
                <div className="relative z-10 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                        <h3 className={`font-bold leading-tight text-white drop-shadow-lg ${nameClass}`}>
                            <span className="block max-w-full break-words text-balance">{displayName}</span>
                        </h3>
                        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white font-bold text-xl shadow-lg">
                            {totalProducts}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-white/90 text-xs font-medium">
                        <Clock size={14} />
                        <span>{sentAtFormatted}</span>
                    </div>
                </div>
            </div>

            {/* Timer avec meilleur design */}
            <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-200">
                <OrderTimer
                    startTime={order.date_envoi_cuisine || Date.now()}
                    variant="chip"
                    accentClassName={urgencyStyles.accent}
                />
            </div>

            {/* Liste des produits épurée */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                <ul className="space-y-2.5">
                    {groupedItems.map((item) => (
                        <li key={item.key} className="group rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition-all hover:shadow-md hover:border-gray-300">
                            <div className="flex items-center gap-3">
                                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl font-black text-white shadow-lg transition-transform group-hover:scale-110 ${urgencyStyles.accent}`}>
                                    {item.quantite}
                                </span>
                                <p className="flex-1 text-[clamp(1.05rem,2.2vw,1.4rem)] font-bold leading-tight text-gray-900">
                                    {item.nom_produit}
                                </p>
                            </div>
                            {item.commentaire && (
                                <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5">
                                    <Flame size={16} className="shrink-0 text-blue-600 mt-0.5" />
                                    <p className="text-xs font-medium italic text-blue-900 leading-relaxed">
                                        {item.commentaire}
                                    </p>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Bouton d'action redessiné */}
            {canMarkReady && (
                <div className="border-t border-gray-200 bg-gradient-to-b from-gray-50 to-white px-6 py-5">
                    <button
                        onClick={() => onReady(order.id, order.date_envoi_cuisine)}
                        className="group relative inline-flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-4 text-base font-black uppercase tracking-wider text-white shadow-xl transition-all hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 transition-opacity group-hover:opacity-100"></div>
                        <ChefHat size={22} className="relative shrink-0 transition-transform group-hover:rotate-12" />
                        <span className="relative">LISTO</span>
                    </button>
                </div>
            )}
        </div>
    );
};


const Cuisine: React.FC = () => {
    const [orders, setOrders] = useState<KitchenTicketOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const { role } = useAuth();

    const canMarkReady = role?.permissions['/cocina'] === 'editor';

    const fetchOrders = useCallback(async () => {
        try {
            const data = await api.getKitchenOrders();
            setOrders(data);
        } catch (error) {
            console.error("Failed to fetch kitchen orders", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 5000);
        const unsubscribe = api.notifications.subscribe('orders_updated', fetchOrders);
        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, [fetchOrders]);

    const handleMarkAsReady = async (orderId: string, ticketTimestamp?: number) => {
        try {
            await api.markOrderAsReady(orderId, ticketTimestamp);
            fetchOrders();
        } catch (error) {
            console.error("Failed to mark order as ready", error);
        }
    };

    if (loading) return <div className="text-gray-700">Cargando pedidos de cocina...</div>;

    return (
        <div className="flex h-full flex-col">
            {orders.length === 0 ? (
                <div className="mt-6 flex flex-1 items-center justify-center">
                    <div className="text-center">
                        <ChefHat size={64} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-2xl font-bold text-gray-400">No hay pedidos en preparación</p>
                    </div>
                </div>
            ) : (
                <div className="mt-6 grid flex-1 grid-cols-1 justify-center gap-6 sm:[grid-template-columns:repeat(auto-fit,minmax(24rem,max-content))] sm:justify-start">
                    {orders.map(order => (
                        <KitchenTicketCard key={order.ticketKey} order={order} onReady={handleMarkAsReady} canMarkReady={canMarkReady} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Cuisine;
