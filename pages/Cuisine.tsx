import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ChefHat } from 'lucide-react';
import { api } from '../services/api';
import { KitchenTicket as KitchenTicketOrder } from '../types';
import { useAuth } from '../contexts/AuthContext';
import OrderTimer from '../components/OrderTimer';
import { getOrderUrgencyStyles } from '../utils/orderUrgency';

// Removed computeNameSizeClass - using explicit clamp() for +30% title size

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
        second: '2-digit',
        hour12: false,
    });
    const displayName = order.table_nom || `Para llevar #${order.id.slice(-4)}`;

    return (
        <div className={`flex h-full min-w-[22rem] flex-col overflow-hidden rounded-xl text-gray-900 shadow-lg transition-shadow duration-300 hover:shadow-xl ${urgencyStyles.border} ${urgencyStyles.background}`}>
            {/* Compact header with title/subtitle on left, badges on right */}
            <div className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                    {/* Title +30% larger with robust clamp() */}
                    <h3 className="font-semibold text-gray-900" style={{ fontSize: 'clamp(2.28rem, 5.07vw, 2.96rem)', lineHeight: '1.1' }}>
                        <span className="block max-w-full break-words text-balance">{displayName}</span>
                    </h3>
                    <p className="text-xs font-medium text-gray-500">
                        Pedido a las {sentAtFormatted}
                    </p>
                </div>
                {/* Badges aligned horizontally on the right */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase text-white shadow ${urgencyStyles.accent}`}>
                        <span>ITEMS</span>
                        <span className="text-base">{totalProducts}</span>
                    </span>
                    <OrderTimer
                        startTime={order.date_envoi_cuisine || Date.now()}
                        variant="chip"
                        accentClassName={urgencyStyles.accent}
                    />
                </div>
            </div>
            {/* Product list with compact spacing */}
            <div className="flex-1 overflow-y-auto px-3">
                <ul className="space-y-2 pb-2">
                    {groupedItems.map((item) => (
                        <li key={item.key} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 shadow-sm">
                            {/* Product row with centered alignment */}
                            <div className="flex items-center gap-2">
                                {/* Square badge with equal width/height */}
                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white shadow-md ${urgencyStyles.accent}`}>
                                    {item.quantite}
                                </span>
                                {/* Product name with tight line-height and zero margin */}
                                <p className="m-0 leading-tight text-[clamp(1rem,2.1vw,1.35rem)] font-semibold text-gray-900" style={{ lineHeight: '1.1', margin: 0 }}>
                                    {item.nom_produit}
                                </p>
                            </div>
                            {item.commentaire && (
                                <p className="mt-1.5 rounded-md border border-dashed border-blue-200 bg-blue-50 px-2 py-1.5 text-xs font-medium italic text-blue-800">
                                    {item.commentaire}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
            {canMarkReady && (
                <div className="border-t border-gray-200 px-3 pb-3 pt-2">
                    <button
                        onClick={() => onReady(order.id, order.date_envoi_cuisine)}
                        className="group inline-flex w-full items-center justify-center gap-3 rounded-lg border-2 border-transparent bg-black px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-sm transition hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/70 focus-visible:ring-offset-2"
                    >
                        <ChefHat size={20} className="shrink-0" />
                        <span>LISTO</span>
                    </button>
                </div>
            )}
        </div>
    );
};


const Cuisine: React.FC = () => {
    // FIX: Define state for orders and loading within the component.
    // The errors "Cannot find name 'loading'" and "Cannot find name 'setLoading'"
    // suggest these state definitions were missing or out of scope.
    const [orders, setOrders] = useState<KitchenTicketOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const { role } = useAuth();

    const canMarkReady = role?.permissions['/cocina'] === 'editor';

    // FIX: Define fetchOrders using useCallback within the component scope.
    // The error "Cannot find name 'fetchOrders'" suggests this function
    // was missing or defined outside the component's scope.
    const fetchOrders = useCallback(async () => {
        try {
            const data = await api.getKitchenOrders();
            setOrders(data);
        // FIX: The caught exception variable in a catch block defines its scope.
        // The error "Cannot find name 'error'" suggests a mismatch, for example,
        // `catch (e)` but then using `error`. Using `catch (error)` makes the `error`
        // variable available within the block.
        } catch (error) {
            console.error("Failed to fetch kitchen orders", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 5000); // Refresh every 5 seconds
        const unsubscribe = api.notifications.subscribe('orders_updated', fetchOrders);
        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, [fetchOrders]);

    const handleMarkAsReady = async (orderId: string, ticketTimestamp?: number) => {
        try {
            await api.markOrderAsReady(orderId, ticketTimestamp);
            fetchOrders(); // Refresh immediately
        } catch (error) {
            console.error("Failed to mark order as ready", error);
        }
    };

    // FIX: Use the 'loading' state variable that is defined within the component.
    if (loading) return <div className="text-gray-700">Cargando pedidos de cocina...</div>;

    return (
        <div className="flex h-full flex-col">
            {orders.length === 0 ? (
                <div className="mt-6 flex flex-1 items-center justify-center text-2xl text-gray-500">No hay pedidos en preparación.</div>
            ) : (
                <div className="mt-6 grid flex-1 grid-cols-1 justify-center gap-4 sm:[grid-template-columns:repeat(auto-fit,minmax(24rem,max-content))] sm:justify-start">
                    {orders.map(order => (
                        <KitchenTicketCard key={order.ticketKey} order={order} onReady={handleMarkAsReady} canMarkReady={canMarkReady} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Cuisine;
