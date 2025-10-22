import React, { useState, FormEvent, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { api } from '../services/api';
import { EditableElementKey, EditableZoneKey, Product, Order, SiteContent, SectionStyle } from '../types';
import { Clock, Mail, MapPin, Menu, X } from 'lucide-react';
import CustomerOrderTracker from '../components/CustomerOrderTracker';
import { clearActiveCustomerOrder, getActiveCustomerOrder } from '../services/customerOrderStorage';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';
import useSiteContent from '../hooks/useSiteContent';
import useCustomFonts from '../hooks/useCustomFonts';
import {
  createBackgroundStyle,
  createBodyTextStyle,
  createElementBackgroundStyle,
  createElementBodyTextStyle,
  createElementTextStyle,
  createHeroBackgroundStyle,
  createTextStyle,
  createSectionVars,
  createHeroVars,
  createElementVars,
} from '../utils/siteStyleHelpers';
import { resolveZoneFromElement } from '../components/SitePreviewCanvas';
import { getHomeRedirectPath } from '../utils/navigation';
import { DEFAULT_SITE_CONTENT as UTILS_DEFAULT_SITE_CONTENT } from '../utils/siteContent';
import { withAppendedQueryParam } from '../utils/url';
import { formatScheduleWindow, isWithinSchedule, minutesUntilNextChange } from '../utils/timeWindow';

const DEFAULT_BRAND_LOGO = '/logo-brand.svg';

const createDefaultSectionStyle = (): SectionStyle => ({
  background: {
    type: 'color',
    color: '#ffffff',
    image: null,
  },
  fontFamily: 'inherit',
  fontSize: '16px',
  textColor: '#000000',
});

const DEFAULT_SITE_CONTENT: SiteContent = UTILS_DEFAULT_SITE_CONTENT;

type PinInputProps = {
  pin: string;
  onPinChange: (pin: string) => void;
  pinLength: number;
  describedBy?: string;
  disabled?: boolean;
};

const PinInput = React.forwardRef<HTMLInputElement, PinInputProps>(({ pin, onPinChange, pinLength, describedBy, disabled }, ref) => {
  const handleKeyClick = (key: string) => {
    if (pin.length < pinLength && !disabled) {
      onPinChange(pin + key);
    }
  };

  const handleDelete = () => {
    if (pin.length > 0 && !disabled) {
      onPinChange(pin.slice(0, -1));
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }
    const sanitized = event.target.value.replace(/\D/g, '').slice(0, pinLength);
    onPinChange(sanitized);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      handleKeyClick(event.key);
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      handleDelete();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      onPinChange('');
    }
  };

  const digitsMessage =
    pin.length === 0
      ? `Aucun chiffre saisi. Vous pouvez entrer ${pinLength} chiffres.`
      : `${pin.length} ${pin.length > 1 ? 'chiffres saisis' : 'chiffre saisi'} sur ${pinLength}.`;

  return (
    <div className="pin-input" aria-label="Clavier numérique sécurisé">
      <input
        ref={ref}
        id="staff-pin-field"
        type="password"
        inputMode="numeric"
        autoComplete="one-time-code"
        className="pin-input__field"
        value={pin}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        aria-describedby={describedBy}
        aria-label={`Code PIN à ${pinLength} chiffres`}
        disabled={disabled}
        aria-disabled={disabled}
        aria-busy={disabled}
      />
      <div className="pin-indicator" role="presentation">
        {Array.from({ length: pinLength }).map((_, index) => (
          <div key={index} className="pin-indicator__slot" aria-hidden="true">
            {pin[index] ? '•' : ''}
          </div>
        ))}
      </div>
      <div className="pin-input__live" aria-live="polite">
        {digitsMessage}
      </div>
      <div className="pin-pad">
        {[...Array(9)].map((_, index) => (
          <button
            type="button"
            key={index + 1}
            onClick={() => handleKeyClick(String(index + 1))}
            className="pin-pad__button"
            disabled={disabled}
          >
            {index + 1}
          </button>
        ))}
        <div aria-hidden="true" />
        <button type="button" onClick={() => handleKeyClick('0')} className="pin-pad__button" disabled={disabled}>
          0
        </button>
        <button type="button" onClick={handleDelete} className="pin-pad__button pin-pad__button--muted" disabled={disabled}>
          DEL
        </button>
      </div>
    </div>
  );
});

PinInput.displayName = 'PinInput';

const computeMenuGridClassName = (count: number): string => {
  if (count === 1) return 'menu-grid menu-grid--single';
  if (count === 2) return 'menu-grid menu-grid--double';
  if (count === 3) return 'menu-grid menu-grid--triple';
  if (count >= 6) return 'menu-grid menu-grid--six';
  if (count > 0) return 'menu-grid menu-grid--multi';
  return 'menu-grid';
};

const computeMenuCardClassName = (count: number): string => {
  const baseClass = 'ui-card menu-card';
  if (count === 1) return `${baseClass} menu-card--single`;
  if (count === 2) return `${baseClass} menu-card--double`;
  if (count === 3) return `${baseClass} menu-card--triple`;
  if (count >= 6) return `${baseClass} menu-card--compact`;
  return baseClass;
};


const Login: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { content: siteContent, loading: siteContentLoading } = useSiteContent();
  const [content, setContent] = useState<SiteContent | null>(() => siteContent);
  useEffect(() => {
    if (siteContent) {
      setContent(siteContent);
    }
  }, [siteContent]);
  const safeContent = content ?? DEFAULT_SITE_CONTENT;
  useCustomFonts(safeContent.assets.library);

  const { navigation, hero, about, menu: menuContent, findUs, footer, onlineOrdering } = safeContent;
  const brandLogo = navigation.brandLogo ?? DEFAULT_BRAND_LOGO;
  const staffTriggerLogo = navigation.brandLogo ?? DEFAULT_BRAND_LOGO;
  
  // New variable-based approach for navigation and hero
  const navigationVars = createSectionVars(navigation.style, 'nav');
  const heroVars = createHeroVars(hero.style, hero.backgroundImage);
  
  // Keep legacy styles for other sections (backwards compatibility)
  const navigationBackgroundStyle = createBackgroundStyle(navigation.style);
  const navigationTextStyle = createTextStyle(navigation.style);
  const heroBackgroundStyle = createHeroBackgroundStyle(hero.style, hero.backgroundImage);
  const heroTextStyle = createTextStyle(hero.style);
  const heroBodyTextStyle = createBodyTextStyle(hero.style);
  const aboutBackgroundStyle = createBackgroundStyle(about.style);
  const aboutTextStyle = createTextStyle(about.style);
  const menuBackgroundStyle = createBackgroundStyle(menuContent.style);
  const menuTextStyle = createTextStyle(menuContent.style);
  const menuBodyTextStyle = createBodyTextStyle(menuContent.style);
  const findUsBackgroundStyle = createBackgroundStyle(findUs.style);
  const findUsTextStyle = createTextStyle(findUs.style);
  const footerBackgroundStyle = createBackgroundStyle(footer.style);
  const footerTextStyle = createBodyTextStyle(footer.style);

  const elementStyles = safeContent.elementStyles ?? {};
  const zoneStyleMap: Record<EditableZoneKey, typeof navigation.style> = {
    navigation: navigation.style,
    hero: hero.style,
    about: about.style,
    menu: menuContent.style,
    instagramReviews: safeContent.instagramReviews.style,
    findUs: findUs.style,
    footer: footer.style,
  };

  const getElementStyle = (key: EditableElementKey) => elementStyles[key];

  const getElementTextStyle = (key: EditableElementKey) => {
    const zone = resolveZoneFromElement(key);
    return createElementTextStyle(zoneStyleMap[zone], getElementStyle(key));
  };

  const getElementBodyTextStyle = (key: EditableElementKey) => {
    const zone = resolveZoneFromElement(key);
    return createElementBodyTextStyle(zoneStyleMap[zone], getElementStyle(key));
  };

  const getElementBackgroundStyle = (key: EditableElementKey) => {
    const zone = resolveZoneFromElement(key);
    return createElementBackgroundStyle(zoneStyleMap[zone], getElementStyle(key));
  };

  // New variable-based helper for elements
  const getElementVars = (key: EditableElementKey, prefix: string) => {
    const zone = resolveZoneFromElement(key);
    return createElementVars(zoneStyleMap[zone], getElementStyle(key), prefix);
  };

  const elementRichText = safeContent.elementRichText ?? {};

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

  const orderingSchedule = onlineOrdering.schedule;
  const scheduleWindowLabel = useMemo(
    () => formatScheduleWindow(orderingSchedule, 'fr-FR'),
    [orderingSchedule.startTime, orderingSchedule.endTime],
  );
  const isOrderingAvailable = isWithinSchedule(orderingSchedule, now);
  const nextChangeMinutes = minutesUntilNextChange(orderingSchedule, now);

  const countdownLabel = useMemo(() => {
    if (nextChangeMinutes === null) {
      return null;
    }

    if (nextChangeMinutes < 1) {
      return 'Réouverture imminente';
    }

    if (nextChangeMinutes < 60) {
      return `Réouverture dans environ ${nextChangeMinutes} min`;
    }

    const hours = Math.floor(nextChangeMinutes / 60);
    const minutes = nextChangeMinutes % 60;
    if (minutes === 0) {
      return `Réouverture dans environ ${hours} h`;
    }
    return `Réouverture dans environ ${hours} h ${minutes.toString().padStart(2, '0')} min`;
  }, [nextChangeMinutes]);

  const getRichTextHtml = (key: EditableElementKey): string | null => {
    const entry = elementRichText[key];
    const html = entry?.html?.trim();
    return html && html.length > 0 ? html : null;
  };

  const renderRichTextElement = <T extends keyof JSX.IntrinsicElements>(
    key: EditableElementKey,
    Component: T,
    props: React.ComponentPropsWithoutRef<T>,
    fallback: string,
  ) => {
    const html = getRichTextHtml(key);
    if (html) {
      return React.createElement(Component, {
        ...props,
        dangerouslySetInnerHTML: { __html: html },
      });
    }
    return React.createElement(Component, props, fallback);
  };

  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState(() => getActiveCustomerOrder());

  const submitPin = useCallback(
    async (pinValue: string) => {
      setLoading(true);
      setError('');

      try {
        const role = await login(pinValue);
        const redirectPath = getHomeRedirectPath(role) ?? '/dashboard';

        setIsModalOpen(false);
        setPin('');
        navigate(redirectPath);
      } catch (error) {
        console.error('Failed to authenticate with PIN', error);
        const message = error instanceof Error && error.message ? error.message : 'PIN invalide';
        setError(message);
        setPin('');
        requestAnimationFrame(() => {
          pinInputRef.current?.focus();
        });
      } finally {
        setLoading(false);
      }
    },
    [login, navigate],
  );

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    const timeout = window.setTimeout(() => {
      pinInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [isModalOpen]);

  useEffect(() => {
    if (pin.length === 6 && !loading) {
      submitPin(pin);
    }
  }, [pin, loading, submitPin]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const historyJSON = window.localStorage.getItem('customer-order-history');
      if (!historyJSON) {
        return;
      }

      const parsed = JSON.parse(historyJSON) as Order[];
      if (Array.isArray(parsed)) {
        setOrderHistory(parsed);
      }
    } catch (error) {
      console.error('Could not load order history', error);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchBestSellers = async () => {
      try {
        const products = await api.getBestSellerProducts();
        if (isMounted) {
          setBestSellers(products);
        }
      } catch (error) {
        console.error('Could not load best seller products', error);
      } finally {
        if (isMounted) {
          setMenuLoading(false);
        }
      }
    };

    fetchBestSellers();

    return () => {
      isMounted = false;
    };
  }, []);

  const findUsMapQuery = findUs.address.trim();
  const customFindUsMapUrlRaw = findUs.mapUrl;
  const customFindUsMapUrl = typeof customFindUsMapUrlRaw === 'string' ? customFindUsMapUrlRaw.trim() : '';
  const hasCustomMapUrl = customFindUsMapUrl.length > 0;
  const encodedFindUsQuery = !hasCustomMapUrl && findUsMapQuery.length > 0
    ? encodeURIComponent(findUsMapQuery)
    : '';
  const findUsMapUrl = hasCustomMapUrl
    ? customFindUsMapUrl
    : encodedFindUsQuery
      ? `https://www.google.com/maps?q=${encodedFindUsQuery}`
      : 'https://www.google.com/maps';
  const findUsMapEmbedUrl = hasCustomMapUrl
    ? withAppendedQueryParam(customFindUsMapUrl, 'output', 'embed')
    : encodedFindUsQuery
      ? `https://www.google.com/maps?q=${encodedFindUsQuery}&output=embed`
      : 'about:blank';
  const hasMapLocation = hasCustomMapUrl || encodedFindUsQuery.length > 0;
  const findUsMapTitle = findUsMapQuery.length > 0 ? findUsMapQuery : findUs.title;
  const activeOrderId = activeOrder?.orderId ?? null;
  const bestSellersToDisplay = bestSellers.slice(0, 6);
  const bestSellerCount = bestSellersToDisplay.length;
  const menuGridClassName = computeMenuGridClassName(bestSellerCount);
  const menuCardClassName = computeMenuCardClassName(bestSellerCount);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (pin.length === 6 && !loading) {
      submitPin(pin);
    }
  };

  const handleNewOrder = () => {
    clearActiveCustomerOrder();
    setActiveOrder(null);
  };

  const handleQuickReorder = (orderId: string) => {
    localStorage.setItem('customer-order-reorder-id', orderId);
    navigate('/commande-client');
  };

  const handleHeroCtaClick = () => {
    if (!isOrderingAvailable) {
      return;
    }
    navigate('/commande-client');
  };

  return (
    <div className="login-page">
      <header className="login-header" style={navigationVars}>
        <div className="layout-container login-header__inner">
          <div className="login-brand">
            <img
              src={brandLogo}
              alt={`Logo ${navigation.brand}`}
              className="login-brand__logo"
            />
            {renderRichTextElement(
              'navigation.brand',
              'span',
              {
                className: 'login-brand__name',
                style: getElementVars('navigation.brand', 'nav-brand'),
              },
              navigation.brand,
            )}
          </div>
          <nav className="login-nav" aria-label="Navigation principale">
            {renderRichTextElement(
              'navigation.links.home',
              'a',
              {
                href: '#accueil',
                className: 'login-nav__link',
                style: getElementVars('navigation.links.home', 'nav-link'),
              },
              navigation.links.home,
            )}
            {renderRichTextElement(
              'navigation.links.about',
              'a',
              {
                href: '#apropos',
                className: 'login-nav__link',
                style: getElementVars('navigation.links.about', 'nav-link'),
              },
              navigation.links.about,
            )}
            {renderRichTextElement(
              'navigation.links.menu',
              'a',
              {
                href: '#menu',
                className: 'login-nav__link',
                style: getElementVars('navigation.links.menu', 'nav-link'),
              },
              navigation.links.menu,
            )}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="login-nav__staff-btn"
              aria-label={navigation.links.loginCta}
            >
              <img src={staffTriggerLogo} alt="" className="login-brand__logo" aria-hidden="true" />
            </button>
          </nav>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="login-header__menu"
            aria-label="Ouvrir le menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="login-menu-overlay" role="dialog" aria-modal="true" style={navigationVars}>
          <button type="button" onClick={() => setMobileMenuOpen(false)} className="login-menu-overlay__close" aria-label="Fermer le menu">
            <X size={28} />
          </button>
          <nav className="login-menu-overlay__nav" aria-label="Navigation mobile">
            {renderRichTextElement(
              'navigation.links.home',
              'a',
              {
                href: '#accueil',
                onClick: () => setMobileMenuOpen(false),
                className: 'login-menu-overlay__link',
                style: getElementVars('navigation.links.home', 'nav-link'),
              },
              navigation.links.home,
            )}
            {renderRichTextElement(
              'navigation.links.about',
              'a',
              {
                href: '#apropos',
                onClick: () => setMobileMenuOpen(false),
                className: 'login-menu-overlay__link',
                style: getElementVars('navigation.links.about', 'nav-link'),
              },
              navigation.links.about,
            )}
            {renderRichTextElement(
              'navigation.links.menu',
              'a',
              {
                href: '#menu',
                onClick: () => setMobileMenuOpen(false),
                className: 'login-menu-overlay__link',
                style: getElementVars('navigation.links.menu', 'nav-link'),
              },
              navigation.links.menu,
            )}
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(true);
                setMobileMenuOpen(false);
              }}
              className="login-nav__staff-btn login-menu-overlay__staff-btn"
              aria-label={navigation.links.loginCta}
            >
              <img src={staffTriggerLogo} alt="" className="login-brand__logo" aria-hidden="true" />
            </button>
          </nav>
        </div>
      )}

      <main>
                   
        <section id="accueil" className="section section-hero" style={heroVars}>
          {activeOrderId ? (
            <CustomerOrderTracker orderId={activeOrderId} onNewOrderClick={handleNewOrder} variant="hero" />
          ) : (
            <div className="hero-content">
              {renderRichTextElement(
                'hero.title',
                'h2',
                {
                  className: 'hero-title',
                  style: { 
                    ...getElementVars('hero.title', 'hero'),
                    '--hero-text-transform': 'uppercase'
                  } as React.CSSProperties,
                },
                hero.title,
              )}
              {renderRichTextElement(
                'hero.subtitle',
                'p',
                {
                  className: 'hero-subtitle',
                  style: getElementVars('hero.subtitle', 'hero-subtitle'),
                },
                hero.subtitle,
              )}
              <button
                onClick={handleHeroCtaClick}
                className={`ui-btn hero-cta ${isOrderingAvailable ? 'ui-btn-accent' : 'hero-cta--disabled'}`.trim()}
                style={getElementVars('hero.ctaLabel', 'hero-cta')}
                disabled={!isOrderingAvailable}
                aria-disabled={!isOrderingAvailable}
              >
                {renderRichTextElement(
                  'hero.ctaLabel',
                  'span',
                  {
                    className: 'inline-flex items-center justify-center',
                    style: getElementBodyTextStyle('hero.ctaLabel'),
                  },
                  hero.ctaLabel,
                )}
              </button>
              {!isOrderingAvailable && (
                <div className="hero-availability">
                  <div className="hero-availability__icon">
                    <Clock size={28} />
                  </div>
                  <div className="hero-availability__content">
                    <p className="hero-availability__label">Commandes en ligne indisponibles</p>
                    <p className="hero-availability__title">{onlineOrdering.closedTitle}</p>
                    <p className="hero-availability__subtitle">
                      {onlineOrdering.closedSubtitle || `Revenez entre ${scheduleWindowLabel}.`}
                    </p>
                    <p className="hero-availability__hours">{scheduleWindowLabel}</p>
                    {countdownLabel && <p className="hero-availability__countdown">{countdownLabel}</p>}
                  </div>
                </div>
              )}
              {orderHistory.length > 0 && (
                <div className="hero-history">
                  {renderRichTextElement(
                    'hero.historyTitle',
                    'p',
                    {
                      className: 'hero-history__title',
                      style: getElementBodyTextStyle('hero.historyTitle'),
                    },
                    hero.historyTitle,
                  )}
                  <div className="hero-history__list">
                    {orderHistory.slice(0, 3).map(order => (
                      <div key={order.id} className="hero-history__item">
                        <div className="hero-history__meta">
                          <p className="hero-history__date" style={heroBodyTextStyle}>
                            Pedido del {new Date(order.date_creation).toLocaleDateString()}
                          </p>
                          <p className="hero-history__details" style={heroBodyTextStyle}>
                            {order.items.length} article(s) • {formatCurrencyCOP(order.total)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleQuickReorder(order.id)}
                          className="hero-history__cta"
                          style={{
                            ...getElementBodyTextStyle('hero.reorderCtaLabel'),
                            ...getElementBackgroundStyle('hero.reorderCtaLabel'),
                          }}
                        >
                          {renderRichTextElement(
                            'hero.reorderCtaLabel',
                            'span',
                            {
                              className: 'inline-flex items-center justify-center',
                              style: getElementBodyTextStyle('hero.reorderCtaLabel'),
                            },
                            hero.reorderCtaLabel,
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section
          id="apropos"
          className="section section-surface"
          style={{ ...aboutBackgroundStyle, ...aboutTextStyle }}
        >
          <div className="section-inner section-inner--center" style={aboutTextStyle}>
            {renderRichTextElement(
              'about.title',
              'h2',
              {
                className: 'section-title',
                style: getElementTextStyle('about.title'),
              },
              about.title,
            )}
            {renderRichTextElement(
              'about.description',
              'p',
              {
                className: 'section-text section-text--muted',
                style: getElementBodyTextStyle('about.description'),
              },
              about.description,
            )}
            {about.image && (
              <img
                src={about.image}
                alt={about.title}
                className="mt-6 h-64 w-full rounded-xl object-cover shadow-lg"
              />
            )}
          </div>
        </section>

        <section
          id="menu"
          className="section section-muted"
          style={{ ...menuBackgroundStyle, ...menuTextStyle }}
        >
          <div className="section-inner section-inner--wide section-inner--center" style={menuTextStyle}>
            {renderRichTextElement(
              'menu.title',
              'h2',
              {
                className: 'section-title',
                style: getElementTextStyle('menu.title'),
              },
              menuContent.title,
            )}
            {menuContent.image && (
              <img
                src={menuContent.image}
                alt={menuContent.title}
                className="mb-8 h-64 w-full rounded-xl object-cover shadow-lg"
              />
            )}
            {menuLoading ? (
              renderRichTextElement(
                'menu.loadingLabel',
                'p',
                {
                  className: 'section-text section-text--muted',
                  style: getElementBodyTextStyle('menu.loadingLabel'),
                },
                menuContent.loadingLabel,
              )
            ) : bestSellersToDisplay.length > 0 ? (
              <div className={menuGridClassName}>
                {bestSellersToDisplay.map(product => (
                  <article key={product.id} className={menuCardClassName}>
                    <img src={product.image} alt={product.nom_produit} className="menu-card__media" />
                    <div className="menu-card__body">
                      <h3 className="menu-card__title" style={menuTextStyle}>
                        {product.nom_produit}
                      </h3>
                      <p className="menu-card__description" style={menuBodyTextStyle}>
                        {product.description}
                      </p>
                      <p className="menu-card__price" style={menuBodyTextStyle}>
                        {formatCurrencyCOP(product.prix_vente)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="section-text section-text--muted" style={menuBodyTextStyle}>
                Aucun produit best seller n'est disponible pour le moment.
              </p>
            )}
            <div className="section-actions">
              <button
                onClick={() => navigate('/commande-client')}
                className="ui-btn ui-btn-primary hero-cta"
                style={{
                  ...getElementBodyTextStyle('menu.ctaLabel'),
                  ...getElementBackgroundStyle('menu.ctaLabel'),
                }}
              >
                {renderRichTextElement(
                  'menu.ctaLabel',
                  'span',
                  {
                    className: 'inline-flex items-center justify-center',
                    style: getElementBodyTextStyle('menu.ctaLabel'),
                  },
                  menuContent.ctaLabel,
                )}
              </button>
            </div>
          </div>
        </section>


       <section
          id="find-us"
          className="section section-surface py-16 sm:py-20"
          style={{ ...findUsBackgroundStyle, ...findUsTextStyle }}
        >
          <div className="section-inner">
            <div className="max-w-4xl mx-auto">
              {/* Header avec gradient */}
              <div className="text-center mb-12">
                <h2 className="text-[clamp(2.5rem,5vw,3.5rem)] font-black tracking-tight bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent mb-4">
                  ENCUÉNTRANOS
                </h2>
                <p className="text-gray-600 text-lg">Visítanos y disfruta de la mejor experiencia</p>
              </div>

              {/* Grille de cartes modernisée */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Carte Dirección */}
                <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 to-cyan-50 p-8 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
                  <div className="relative">
                    <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg group-hover:scale-110 transition-transform">
                      <MapPin className="w-8 h-8" />
                    </div>
                    {renderRichTextElement(
                      'findUs.addressLabel',
                      'h3',
                      {
                        className: 'text-xl font-bold text-gray-900 mb-3',
                      },
                      findUs.addressLabel,
                    )}
                    {renderRichTextElement(
                      'findUs.address',
                      'p',
                      {
                        className: 'text-gray-700 font-semibold mb-1',
                      },
                      findUs.address,
                    )}
                  </div>
                </div>

                {/* Carte Horarios */}
                <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-50 to-pink-50 p-8 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
                  <div className="relative">
                    <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg group-hover:scale-110 transition-transform">
                      <Clock className="w-8 h-8" />
                    </div>
                    {renderRichTextElement(
                      'findUs.hoursLabel',
                      'h3',
                      {
                        className: 'text-xl font-bold text-gray-900 mb-3',
                      },
                      findUs.hoursLabel,
                    )}
                    {renderRichTextElement(
                      'findUs.hours',
                      'p',
                      {
                        className: 'text-gray-700 font-semibold',
                      },
                      findUs.hours,
                    )}
                  </div>
                </div>

                {/* Carte Email */}
                <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-50 to-amber-50 p-8 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"></div>
                  <div className="relative">
                    <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg group-hover:scale-110 transition-transform">
                      <Mail className="w-8 h-8" />
                    </div>
                    {renderRichTextElement(
                      'findUs.cityLabel',
                      'h3',
                      {
                        className: 'text-xl font-bold text-gray-900 mb-3',
                      },
                      findUs.cityLabel,
                    )}
                    {renderRichTextElement(
                      'findUs.city',
                      'p',
                      {
                        className: 'text-gray-700 font-semibold hover:text-orange-600 transition-colors break-all',
                      },
                      findUs.city,
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
</main>
      
      <footer className="site-footer" style={{ ...footerBackgroundStyle, ...footerTextStyle }}>
        <div className="layout-container site-footer__inner" style={footerTextStyle}>
          <p style={getElementBodyTextStyle('footer.text')}>
            &copy; {new Date().getFullYear()} {navigation.brand}.{' '}
            {renderRichTextElement(
              'footer.text',
              'span',
              {
                style: getElementBodyTextStyle('footer.text'),
              },
              footer.text,
            )}
          </p>
        </div>
      </footer>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPin('');
          setError('');
        }}
        title="Connexion du personnel"
        size="lg"
      >
        <div className="login-modal">
          <form onSubmit={handleFormSubmit} className="login-modal__form" aria-describedby={error ? 'staff-pin-error' : undefined}>
            <div className="login-modal__panel">
              <PinInput
                ref={pinInputRef}
                pin={pin}
                onPinChange={setPin}
                pinLength={6}
                describedBy={error ? 'staff-pin-error' : undefined}
                disabled={loading}
              />
              {error && (
                <p id="staff-pin-error" className="login-modal__error" role="alert" aria-live="assertive">
                  {error}
                </p>
              )}
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default Login;
