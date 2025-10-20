import React, { memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Product, Category } from '../../types';
import { formatCurrencyCOP } from '../../utils/formatIntegerAmount';

export interface ProductGridProps {
    filteredProducts: Product[];
    quantities: Record<string, number>;
    onAdd: (product: Product) => void;
    activeCategoryId: string;
    categories: Category[];
    onSelectCategory: (categoryId: string) => void;
    isProductAvailable: (product: Product) => boolean;
    handleProductPointerDown: (
        product: Product,
    ) => (event: React.PointerEvent<HTMLButtonElement>) => void;
    handleProductKeyDown: (
        product: Product,
    ) => (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}

const ProductGridComponent: React.FC<ProductGridProps> = ({
    filteredProducts,
    quantities,
    onAdd,
    activeCategoryId,
    categories,
    onSelectCategory,
    isProductAvailable,
    handleProductPointerDown,
    handleProductKeyDown,
}) => {
    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b bg-white/80 p-4">
                <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-2">
                    <button
                        onClick={() => onSelectCategory('all')}
                        className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition ${
                            activeCategoryId === 'all'
                                ? 'bg-brand-primary text-brand-secondary shadow'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                        Tous
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => onSelectCategory(cat.id)}
                            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition ${
                                activeCategoryId === cat.id
                                    ? 'bg-brand-primary text-brand-secondary shadow'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            {cat.nom}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredProducts.map((product) => {
                        const isLowStock = !isProductAvailable(product);
                        const quantityInCart = quantities[product.id] || 0;
                        const isSelected = quantityInCart > 0;
                        const handleProductClick = () => onAdd(product);
                        const handlePointerDown = handleProductPointerDown(product);
                        const handleKeyDown = handleProductKeyDown(product);

                        return (
                            <button
                                key={product.id}
                                type="button"
                                onClick={handleProductClick}
                                onPointerDown={handlePointerDown}
                                onKeyDown={handleKeyDown}
                                className={`relative flex h-full flex-col items-center justify-between rounded-xl p-3 text-center transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-gray-900 ${
                                    isSelected
                                        ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-black shadow-xl shadow-orange-500/30'
                                        : 'border border-gray-200 bg-white text-black hover:shadow-lg'
                                } ${isLowStock && !isSelected ? 'border-2 border-yellow-500' : ''}`}
                            >
                                {quantityInCart > 0 && (
                                    <div className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-accent text-xs font-bold text-white">
                                        {quantityInCart}
                                    </div>
                                )}
                                {isLowStock && (
                                    <div
                                        className={`absolute right-1 top-1 rounded-full p-1 text-white ${isSelected ? 'bg-black/30' : 'bg-yellow-500'}`}
                                        title="Stock bas"
                                    >
                                        <AlertTriangle size={16} />
                                    </div>
                                )}
                                <img
                                    src={product.image}
                                    alt={product.nom_produit}
                                    className="mb-3 aspect-square w-full max-w-[18rem] rounded-md object-cover"
                                />
                                <p
                                    className="text-[clamp(0.9rem,1.8vw,1.05rem)] font-semibold leading-snug text-black text-balance text-center break-words whitespace-normal [hyphens:auto]"
                                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                                >
                                    {product.nom_produit}
                                </p>
                                <p
                                    className="mt-1 w-full flex-1 text-xs text-black text-center leading-snug"
                                    style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                                >
                                    {product.description}
                                </p>
                                <p className="mt-3 font-bold text-black">
                                    {formatCurrencyCOP(product.prix_vente)}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default memo(ProductGridComponent);
