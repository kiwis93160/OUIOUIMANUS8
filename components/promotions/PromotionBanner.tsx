import React from 'react';
import { Promotion } from '../../types/promotions';
import { ArrowRight } from 'lucide-react';

interface PromotionBannerProps {
  promotion: Promotion;
  onClick?: () => void;
  className?: string;
}

/**
 * Composant pour afficher une bannière promotionnelle sur la page d'accueil
 */
const PromotionBanner: React.FC<PromotionBannerProps> = ({
  promotion,
  onClick,
  className = '',
}) => {
  const { visuals } = promotion;
  
  // Si la promotion n'a pas d'éléments visuels définis, utiliser des valeurs par défaut
  const bannerText = visuals?.banner_text || promotion.name;
  const bannerCta = visuals?.banner_cta || 'En profiter';
  const bannerImage = visuals?.banner_image || visuals?.banner_url;
  
  // Déterminer le texte du badge en fonction du type de promotion
  let badgeText = visuals?.badge_text || '';
  if (!badgeText) {
    if (promotion.type === 'percentage') {
      badgeText = `-${promotion.discount.value}%`;
    } else if (promotion.type === 'fixed_amount') {
      badgeText = `-${promotion.discount.value}`;
    } else if (promotion.type === 'buy_x_get_y') {
      const { buy_quantity, get_quantity } = promotion.conditions;
      badgeText = buy_quantity && get_quantity ? `${buy_quantity}x${get_quantity}` : '2x1';
    } else if (promotion.type === 'promo_code') {
      badgeText = 'CODE';
    } else {
      badgeText = 'PROMO';
    }
  }
  
  const hasBackgroundImage = Boolean(bannerImage);
  const secondaryText = visuals?.description || visuals?.display_text || '';

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`relative mb-6 overflow-hidden rounded-2xl shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`.trim()}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={handleKeyDown}
      aria-label={bannerText}
    >
      <div className="absolute inset-0">
        {hasBackgroundImage ? (
          <img
            src={bannerImage!}
            alt={bannerText}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#1F2937] via-[#111827] to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/75" />
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-[#FF7A18]/40 via-[#FF3D00]/25 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-48 w-48 rounded-full bg-[#FF3D00]/15 blur-[70px]" />
      </div>

      <div className="relative flex h-36 items-center px-6 py-5 md:h-44">
        <div className="flex flex-1 flex-col gap-3 text-white md:gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
            <span
              className="inline-flex items-center gap-1 rounded-full border border-white/35 bg-white/15 px-3 py-1 backdrop-blur-sm"
              style={{ backgroundColor: visuals?.badge_bg_color || undefined, borderColor: visuals?.badge_color || undefined }}
            >
              <span className="leading-none" style={{ color: visuals?.badge_color || '#ffffff' }}>
                {badgeText}
              </span>
            </span>
            {visuals?.display_text && (
              <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] tracking-[0.12em] text-white/80 backdrop-blur-sm">
                {visuals.display_text}
              </span>
            )}
          </div>

          <h3 className="max-w-xl text-2xl font-bold leading-tight drop-shadow md:text-3xl">
            {bannerText}
          </h3>

          {secondaryText && (
            <p className="max-w-xl text-sm font-medium text-white/85 md:text-base">
              {secondaryText}
            </p>
          )}

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FF7A18] via-[#FF3D00] to-[#C81D11] px-4 py-2 text-sm font-semibold shadow-lg shadow-[#FF3D00]/35 transition-colors hover:from-[#FF7A18]/90 hover:via-[#FF3D00]/90 hover:to-[#C81D11]/90">
              {bannerCta}
              <ArrowRight size={16} className="-mr-1" />
            </span>
            {promotion.type === 'promo_code' && promotion.discount?.promo_code && (
              <span className="rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-semibold tracking-widest text-white/80">
                {promotion.discount.promo_code}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromotionBanner;
