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
} from 'lucide-react';
import { api, getBusinessDayStart } from '../services/api';
import { DashboardStats, SalesDataPoint, DashboardPeriod } from '../types';
import Modal from '../components/Modal';
import RoleManager from '../components/role-manager';
import { formatCurrencyCOP, formatIntegerAmount } from '../utils/formatIntegerAmount';

const decimalFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 0 });
const formatDecimal = (value: number): string => decimalFormatter.format(Number.isFinite(value) ? value : 0);

const computePercentChange = (current: number, previous: number | null | undefined): number | null => {
    if (previous === null || previous === undefined) {
        return null;
    }
    if (previous === 0) {
        if (current === 0) {
            return 0;
        }
        return 100;
    }
    return ((current - previous) / Math.abs(previous)) * 100;
};

const MainStatCard: React.FC<{
    title: string;
    value: string;
    icon: React.ReactNode;
    helper?: string;
    comparison?: number | null;
}> = ({ title, value, icon, helper, comparison }) => {
    const hasComparison = typeof comparison === 'number' && Number.isFinite(comparison);
    const normalizedComparison = hasComparison ? comparison ?? 0 : 0;
    const comparisonValue = hasComparison ? formatDecimal(Math.abs(normalizedComparison)) : null;
    const signSymbol = !hasComparison || normalizedComparison === 0 ? '' : normalizedComparison > 0 ? '+' : '−';
    const comparisonLabel = comparisonValue ? `${signSymbol}${comparisonValue}%` : 'N/A';
    const comparisonTone = !hasComparison
        ? 'bg-white/10 text-white/60'
        : normalizedComparison < 0
            ? 'bg-red-500/20 text-red-200'
            : normalizedComparison > 0
                ? 'bg-emerald-500/25 text-emerald-100'
                : 'bg-white/10 text-white/70';

    return (
        <article className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-lg transition-all hover:shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900/85 to-slate-900/60" aria-hidden />
            <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" aria-hidden />
            <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden />
            <div className="relative flex flex-col gap-6 p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">{title}</p>
                        <p className="text-3xl font-bold leading-tight text-balance break-words sm:text-4xl">{value}</p>
                    </div>
                    <div className="shrink-0 rounded-2xl bg-white/10 p-3 text-white shadow-inner shadow-white/10">
                        {icon}
                    </div>
                </div>
                <div className="flex flex-col gap-3 text-sm text-white/70">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex min-w-[5.5rem] items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] ${comparisonTone}`}>
                            {comparisonLabel}
                        </span>
                        <span className="text-xs font-medium text-white/60">vs période précédente</span>
                    </div>
                    {helper ? <p className="text-xs leading-relaxed text-white/70">{helper}</p> : null}
                </div>
            </div>
        </article>
    );
};

const OpStatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; onClick?: () => void }> = ({ title, value, icon, onClick }) => {
    const interactiveProps = onClick
        ? {
            role: 'button' as const,
            tabIndex: 0,
            onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onClick();
                }
            },
        }
        : {};

    return (
        <div
            className={`relative flex min-w-0 items-center gap-3 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg ${
                onClick ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400' : ''
            }`}
            onClick={onClick}
            {...interactiveProps}
        >
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-slate-100" aria-hidden />
            <div className="relative shrink-0 rounded-2xl bg-slate-900/5 p-3 text-slate-600">
                {icon}
            </div>
            <div className="relative min-w-0 flex-1 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{title}</p>
                <p className="text-xl font-bold leading-tight text-balance break-words text-slate-900 sm:text-2xl">{value}</p>
            </div>
        </div>
    );
};


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
    const previousRevenueTotal = stats.ventesPeriodePrecedente;
    const revenueTrend = computePercentChange(stats.ventesPeriode, stats.ventesPeriodePrecedente);
    const profitMargin = stats.ventesPeriode > 0 ? (stats.beneficePeriode / stats.ventesPeriode) * 100 : null;
    const previousProfitMargin = stats.ventesPeriodePrecedente > 0
        ? (stats.beneficePeriodePrecedente / stats.ventesPeriodePrecedente) * 100
        : null;
    const ordersCount = stats.commandesPeriode;
    const averageDailyRevenue = periodConfig.days > 0 ? stats.ventesPeriode / periodConfig.days : 0;
    const revenuePerClient = stats.clientsPeriode > 0 ? stats.ventesPeriode / stats.clientsPeriode : 0;
    const averageOrdersPerDay = periodConfig.days > 0 ? ordersCount / periodConfig.days : 0;
    const averageClientsPerDay = periodConfig.days > 0 ? stats.clientsPeriode / periodConfig.days : 0;
    const panierMoyenPrecedent = stats.commandesPeriodePrecedente > 0
        ? stats.ventesPeriodePrecedente / stats.commandesPeriodePrecedente
        : 0;
    const revenuePerClientPrecedent = stats.clientsPeriodePrecedente > 0
        ? stats.ventesPeriodePrecedente / stats.clientsPeriodePrecedente
        : 0;
    const averageDailyRevenuePrecedent = periodConfig.days > 0 ? stats.ventesPeriodePrecedente / periodConfig.days : 0;
    const beneficeTrend = computePercentChange(stats.beneficePeriode, stats.beneficePeriodePrecedente);
    const profitMarginTrend = profitMargin !== null ? computePercentChange(profitMargin, previousProfitMargin ?? null) : null;
    const ordersTrend = computePercentChange(ordersCount, stats.commandesPeriodePrecedente);
    const panierTrend = computePercentChange(stats.panierMoyen, panierMoyenPrecedent);
    const revenuePerClientTrend = computePercentChange(revenuePerClient, revenuePerClientPrecedent);
    const clientsTrend = computePercentChange(stats.clientsPeriode, stats.clientsPeriodePrecedente);
    const averageDailyRevenueTrend = computePercentChange(averageDailyRevenue, averageDailyRevenuePrecedent);

    return (
        <div className="space-y-8">
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-sm font-semibold text-slate-600 shadow-inner">
                        {Object.entries(PERIOD_CONFIG).map(([key, option]) => {
                            const value = key as DashboardPeriod;
                            const isActive = period === value;
                            return (
                                <button
                                    key={value}
                                    onClick={() => setPeriod(value)}
                                    className={`rounded-full px-4 py-1.5 transition ${isActive ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'hover:text-slate-900'}`}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                    <button
                        onClick={() => setRoleManagerOpen(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                    >
                        <Shield className="h-4 w-4" />
                        Gestión de roles
                    </button>
                </div>
            </div>

            {/* Bloc 1 : Indicateurs financiers */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                <MainStatCard
                    title={`Chiffre d'affaires (${stats.periodLabel})`}
                    value={formatCurrencyCOP(stats.ventesPeriode)}
                    icon={<DollarSign size={24} />}
                    comparison={revenueTrend}
                    helper={`Période précédente : ${formatCurrencyCOP(previousRevenueTotal)}`}
                />
                <MainStatCard
                    title="Bénéfice net"
                    value={formatCurrencyCOP(stats.beneficePeriode)}
                    icon={<TrendingUp size={24} />}
                    comparison={beneficeTrend}
                    helper={profitMargin !== null ? `Marge : ${formatDecimal(profitMargin)}%` : 'Marge indisponible'}
                />
                <MainStatCard
                    title="Marge bénéficiaire"
                    value={profitMargin !== null ? `${formatDecimal(profitMargin)}%` : '0%'}
                    icon={<Percent size={24} />}
                    comparison={profitMarginTrend}
                    helper={`Profit : ${formatCurrencyCOP(stats.beneficePeriode)}`}
                />
                <MainStatCard
                    title="Commandes traitées"
                    value={formatIntegerAmount(ordersCount)}
                    icon={<ShoppingBag size={24} />}
                    comparison={ordersTrend}
                    helper={`≈ ${formatDecimal(averageOrdersPerDay)} commandes / jour`}
                />
            </div>

            {/* Bloc 2 : Clients et panier */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                <MainStatCard
                    title="Ticket moyen"
                    value={formatCurrencyCOP(stats.panierMoyen)}
                    icon={<Receipt size={24} />}
                    comparison={panierTrend}
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
                    comparison={revenuePerClientTrend}
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
                    comparison={clientsTrend}
                    helper={`≈ ${formatDecimal(averageClientsPerDay)} clients / jour`}
                />
                <MainStatCard
                    title="Revenu moyen quotidien"
                    value={formatCurrencyCOP(averageDailyRevenue)}
                    icon={<CalendarDays size={24} />}
                    comparison={averageDailyRevenueTrend}
                    helper={`Total période : ${formatCurrencyCOP(stats.ventesPeriode)}`}
                />
            </div>

            {/* Bloc 3 : Statut opérationnel */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-slate-900 text-balance">Ventas durante {stats.periodLabel}</h3>
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
            </section>

            {/* Bloc 5 : Répartition des ventes */}
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <h3 className="text-lg font-semibold text-slate-900 text-balance">Distribución de ventas ({stats.periodLabel})</h3>
                    <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-sm font-semibold text-slate-600 shadow-inner">
                        <button onClick={() => setPieChartMode('category')} className={`rounded-full px-3 py-1 transition ${pieChartMode === 'category' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/15' : 'hover:text-slate-900'}`}>Por categoría</button>
                        <button onClick={() => setPieChartMode('product')} className={`rounded-full px-3 py-1 transition ${pieChartMode === 'product' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/15' : 'hover:text-slate-900'}`}>Por producto</button>
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
                    <div style={{ height: 300 }} className="flex items-center justify-center text-slate-500">
                        No hay datos para el periodo seleccionado.
                    </div>
                )}
            </section>

            <Modal isOpen={isLowStockModalOpen} onClose={() => setLowStockModalOpen(false)} title="Ingredientes con inventario bajo">
                {stats.ingredientsStockBas.length > 0 ? (
                    <ul className="space-y-2">
                        {stats.ingredientsStockBas.map(ing => (
                            <li key={ing.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm shadow-sm">
                                <span className="min-w-0 flex-1 break-words font-semibold text-red-800">{ing.nom}</span>
                                <span className="shrink-0 text-base font-bold text-red-600">{ing.stock_actuel} / {ing.stock_minimum} {ing.unite}</span>
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
