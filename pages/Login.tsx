      <main>
        <section id="accueil" className="section section-hero" style={{ ...heroBackgroundStyle, ...heroTextStyle }}>
          {activeOrderId ? (
            <CustomerOrderTracker orderId={activeOrderId} onNewOrderClick={handleNewOrder} variant="hero" />
          ) : (
            <div className="hero-content" style={heroTextStyle}>
              {renderRichTextElement(
                'hero.title',
                'h2',
                {
                  className: 'hero-title',
                  style: getElementTextStyle('hero.title'),
                },
                hero.title,
              )}
              {renderRichTextElement(
                'hero.subtitle',
                'p',
                {
                  className: 'hero-subtitle',
                  style: getElementBodyTextStyle('hero.subtitle'),
                },
                hero.subtitle,
              )}
              <button
                onClick={handleHeroCtaClick}
                className={`ui-btn hero-cta ${isOrderingAvailable ? 'ui-btn-accent' : 'hero-cta--disabled'}`.trim()}
                style={{
                  ...getElementBodyTextStyle('hero.ctaLabel'),
                  ...getElementBackgroundStyle('hero.ctaLabel'),
                }}
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
