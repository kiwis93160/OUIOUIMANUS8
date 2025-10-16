import React, { useCallback, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
    DollarSign,
    Users,
    Armchair,
    AlertTriangle,
    Soup,
    Shield,
    TrendingUp,
    Percent,
    ShoppingBag,
    CalendarDays,
    UserCheck,
    Receipt,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react';
import { api, getBusinessDayStart } from '../services/api';
import { DashboardStats, SalesDataPoint, DashboardPeriod } from '../types';
import Modal from '../components/Modal';
import RoleManager from '../components/role-manager';
import { formatCurrencyCOP, formatIntegerAmount } from '../utils/formatIntegerAmount';

const decimalFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 0 });
const formatDecimal = (value: number): string => decimalFormatter.format(Number.isFinite(value) ? value : 0);

const TrendPill: React.FC<{ value: number }> = ({ value }) => {
    const isPositive = value >= 0;
    const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}
        >
            <Icon className="h-4 w-4" />
            {Math.abs(value).toFixed(1)}%
        </span>
    );
};

const MainStatCard: React.FC<{
    title: string;
    value: string;
    icon: React.ReactNode;
    helper?: string;
    trend?: number | null;
}> = ({ title, value, icon, helper, trend }) => (
    <div className="ui-card flex min-w-0 flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-primary/10 p-3 text-brand-primary">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
                <div className="mt-1 flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-gray-900 sm:text-3xl">{value}</p>
                    {typeof trend === 'number' ? <TrendPill value={trend} /> : null}
                </div>
            </div>
        </div>
        {helper ? <p className="text-sm text-gray-500">{helper}</p> : null}
    </div>
);

const OpStatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; onClick?: () => void }> = ({ title, value, icon, onClick }) => (
    <div className={`ui-card p-4 flex items-center space-x-3 min-w-0 ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''}`} onClick={onClick}>
        <div className="p-3 bg-gray-100 text-gray-600 rounded-lg">
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">{title}</p>
            <p className="text-lg sm:text-xl xl:text-2xl font-bold text-gray-800 break-words leading-tight">{value}</p>
        </div>
    </div>
);


const PERIOD_CONFIG: Record<DashboardPeriod, { label: string; days: number }> = {
    week: { label: 'Últimos 7 días', days: 7 },
    month: { label: 'Últimos 30 días', days: 30 },
};

const resolvePeriodBounds = (period: DashboardPeriod) => {
    const { days } = PERIOD_CONFIG[period];
    const end = new Date(getBusinessDayStart());
    end.setDate(end.getDate() + 1);
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    return { start, end };
};

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [salesByProduct, setSalesByProduct] = useState<SalesDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [pieChartMode, setPieChartMode] = useState<'category' | 'product'>('category');
    const [isLowStockModalOpen, setLowStockModalOpen] = useState(false);
    const [isRoleManagerOpen, setRoleManagerOpen] = useState(false);
    const [period, setPeriod] = useState<DashboardPeriod>('week');

    const fetchAllStats = useCallback(async () => {
        const { start, end } = resolvePeriodBounds(period);
        const startIso = start.toISOString();
        const endIso = end.toISOString();
        setLoading(true);
        try {
            const [statsData, productSalesData] = await Promise.all([
                api.getDashboardStats(period),
                api.getSalesByProduct({ start: startIso, end: endIso })
            ]);
            setStats(statsData);
            setSalesByProduct(productSalesData);
        } catch (error) {
            console.error("Failed to fetch dashboard stats", error);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        fetchAllStats();
    }, [fetchAllStats]);

    useEffect(() => {
        const unsubscribe = api.notifications.subscribe('orders_updated', () => {
            fetchAllStats();
        });

        return () => {
            unsubscribe();
        };
    }, [fetchAllStats]);

    if (loading) return <div className="text-gray-800">Cargando datos del panel...</div>;
    if (!stats) return <div className="text-red-500">No fue posible cargar los datos.</div>;

    const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560', '#775DD0'];
    const pieData = pieChartMode === 'category' ? stats.ventesParCategorie : salesByProduct;
    const hasPieData = pieData.length > 0;

    const periodConfig = PERIOD_CONFIG[period];
    const previousRevenueTotal = stats.ventesPeriodeSeries.reduce((sum, point) => sum + (point.ventesPeriodePrecedente ?? 0), 0);
    const revenueTrend = previousRevenueTotal > 0 ? ((stats.ventesPeriode - previousRevenueTotal) / previousRevenueTotal) * 100 : null;
    const profitMargin = stats.ventesPeriode > 0 ? (stats.beneficePeriode / stats.ventesPeriode) * 100 : null;
    const ordersCount = stats.panierMoyen > 0 ? Math.round(stats.ventesPeriode / stats.panierMoyen) : 0;
    const averageDailyRevenue = periodConfig.days > 0 ? stats.ventesPeriode / periodConfig.days : 0;
    const revenuePerClient = stats.clientsPeriode > 0 ? stats.ventesPeriode / stats.clientsPeriode : 0;
    const averageOrdersPerDay = periodConfig.days > 0 ? ordersCount / periodConfig.days : 0;
    const averageClientsPerDay = periodConfig.days > 0 ? stats.clientsPeriode / periodConfig.days : 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="inline-flex rounded-lg bg-gray-100 p-1 text-sm font-semibold text-gray-600">
                    {Object.entries(PERIOD_CONFIG).map(([key, option]) => {
                        const value = key as DashboardPeriod;
                        const isActive = period === value;
                        return (
                            <button
                                key={value}
                                onClick={() => setPeriod(value)}
                                className={`px-3 py-1.5 rounded-md transition-colors ${isActive ? 'bg-white text-gray-900 shadow' : 'hover:text-gray-900'}`}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
                <button
                    onClick={() => setRoleManagerOpen(true)}
                    className="ui-btn-primary"
                >
                    <Shield className="mr-2 h-4 w-4" />
                    Gestión de roles
                </button>
            </div>

            {/* Bloc 1 : Indicateurs financiers */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                <MainStatCard
                    title={`Chiffre d'affaires (${stats.periodLabel})`}
                    value={formatCurrencyCOP(stats.ventesPeriode)}
                    icon={<DollarSign size={24} />}
                    trend={revenueTrend}
                    helper={
                        previousRevenueTotal > 0
                            ? `Période précédente : ${formatCurrencyCOP(previousRevenueTotal)}`
                            : 'Pas de période de référence'
                    }
                />
                <MainStatCard
                    title="Bénéfice net"
                    value={formatCurrencyCOP(stats.beneficePeriode)}
                    icon={<TrendingUp size={24} />}
                    helper={profitMargin !== null ? `Marge : ${formatDecimal(profitMargin)}%` : 'Marge indisponible'}
                />
                <MainStatCard
                    title="Marge bénéficiaire"
                    value={profitMargin !== null ? `${formatDecimal(profitMargin)}%` : '0%'}
                    icon={<Percent size={24} />}
                    helper={`Profit : ${formatCurrencyCOP(stats.beneficePeriode)}`}
                />
                <MainStatCard
                    title="Commandes traitées"
                    value={formatIntegerAmount(ordersCount)}
                    icon={<ShoppingBag size={24} />}
                    helper={`≈ ${formatDecimal(averageOrdersPerDay)} commandes / jour`}
                />
            </div>

            {/* Bloc 2 : Clients et panier */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                <MainStatCard
                    title="Ticket moyen"
                    value={formatCurrencyCOP(stats.panierMoyen)}
                    icon={<Receipt size={24} />}
                    helper={
                        ordersCount > 0
                            ? `Basé sur ${formatIntegerAmount(ordersCount)} commandes`
                            : 'Aucune commande sur la période'
                    }
                />
                <MainStatCard
                    title="Revenu par client"
                    value={formatCurrencyCOP(revenuePerClient)}
                    icon={<UserCheck size={24} />}
                    helper={
                        stats.clientsPeriode > 0
                            ? `${formatIntegerAmount(stats.clientsPeriode)} clients servis`
                            : 'Aucun client sur la période'
                    }
                />
                <MainStatCard
                    title={`Clients (${stats.periodLabel})`}
                    value={formatIntegerAmount(stats.clientsPeriode)}
                    icon={<Users size={24} />}
                    helper={`≈ ${formatDecimal(averageClientsPerDay)} clients / jour`}
                />
                <MainStatCard
                    title="Revenu moyen quotidien"
                    value={formatCurrencyCOP(averageDailyRevenue)}
                    icon={<CalendarDays size={24} />}
                    helper={`Total période : ${formatCurrencyCOP(stats.ventesPeriode)}`}
                />
            </div>

            {/* Bloc 3 : Statut opérationnel */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <OpStatCard title="Mesas ocupadas" value={stats.tablesOccupees} icon={<Armchair size={24}/>} />
                <OpStatCard title="Clientes actuales" value={stats.clientsActuels} icon={<Users size={24}/>} />
                <OpStatCard title="En cocina" value={stats.commandesEnCuisine} icon={<Soup size={24}/>} />
                <OpStatCard
                    title="Ingredientes bajos"
                    value={stats.ingredientsStockBas.length}
                    icon={<AlertTriangle size={24} className={stats.ingredientsStockBas.length > 0 ? 'text-red-500' : 'text-gray-600'} />}
                    onClick={() => setLowStockModalOpen(true)}
                />
            </div>

            {/* Bloc 4 : Évolution des ventes */}
            <div className="ui-card p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Ventas durante {stats.periodLabel}</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.ventesPeriodeSeries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="ventes" fill="#8884d8" name={`${stats.periodLabel}`} />
                        <Bar dataKey="ventesPeriodePrecedente" fill="#d8d6f5" name="Periodo anterior" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Bloc 5 : Répartition des ventes */}
            <div className="ui-card p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Distribución de ventas ({stats.periodLabel})</h3>
                    <div className="flex p-1 bg-gray-200 rounded-lg">
                        <button onClick={() => setPieChartMode('category')} className={`px-3 py-1 text-sm font-semibold rounded-md ${pieChartMode === 'category' ? 'bg-white shadow' : ''}`}>Por categoría</button>
                        <button onClick={() => setPieChartMode('product')} className={`px-3 py-1 text-sm font-semibold rounded-md ${pieChartMode === 'product' ? 'bg-white shadow' : ''}`}>Por producto</button>
                    </div>
                </div>
                {hasPieData ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrencyCOP(value)} />
                            <Legend/>
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{ height: 300 }} className="flex items-center justify-center text-gray-500">
                        No hay datos para el periodo seleccionado.
                    </div>
                )}
            </div>

            <Modal isOpen={isLowStockModalOpen} onClose={() => setLowStockModalOpen(false)} title="Ingredientes con inventario bajo">
                {stats.ingredientsStockBas.length > 0 ? (
                    <ul className="space-y-2">
                        {stats.ingredientsStockBas.map(ing => (
                            <li key={ing.id} className="flex justify-between items-center bg-red-50 p-3 rounded-lg">
                                <span className="font-semibold text-red-800">{ing.nom}</span>
                                <span className="font-bold text-red-600">{ing.stock_actuel} / {ing.stock_minimum} {ing.unite}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-600 text-center">No hay ingredientes con inventario bajo por el momento.</p>
                )}
            </Modal>

            <RoleManager isOpen={isRoleManagerOpen} onClose={() => setRoleManagerOpen(false)} />
        </div>
    );
};

export default Dashboard;
