# CSS Variables Reference Guide

This document lists all CSS custom properties (variables) available for theming customization.

## Navigation Header

### Section Variables
Applied to: `<header class="login-header">`

- `--nav-bg-color` - Navigation background color (default: #0f172a)
- `--nav-bg-image` - Navigation background image URL
- `--nav-text-color` - Navigation text color (default: #e2e8f0)
- `--nav-font-family` - Navigation font family (default: Inter, ui-sans-serif, system-ui, sans-serif)
- `--nav-font-size` - Navigation font size (default: inherited)

### Brand Element
Applied to: `<span class="login-brand__name">`

- `--nav-brand-text-color` - Brand name text color
- `--nav-brand-font-family` - Brand name font family
- `--nav-brand-font-size` - Brand name font size (default: clamp(1.5rem, 2.8vw, 2rem))
- `--nav-brand-font-weight` - Brand name font weight
- `--nav-brand-font-style` - Brand name font style

### Navigation Links
Applied to: `<a class="login-nav__link">`

- `--nav-link-text-color` - Link text color
- `--nav-link-font-family` - Link font family
- `--nav-link-font-size` - Link font size (default: clamp(0.9rem, 1.8vw, 1rem))
- `--nav-link-font-weight` - Link font weight
- `--nav-link-font-style` - Link font style

## Hero Section

### Section Variables
Applied to: `<section class="section-hero">`

- `--hero-bg-color` - Hero background color (default: #0f172a)
- `--hero-bg-image` - Hero background image URL (supports fallback)
- `--hero-text-color` - Hero text color (default: #f8fafc)
- `--hero-font-family` - Hero font family (default: Inter, ui-sans-serif, system-ui, sans-serif)

### Hero Title
Applied to: `<h2 class="hero-title">`

- `--hero-text-color` - Title text color (inherits from section)
- `--hero-font-family` - Title font family (inherits from section)
- `--hero-font-size` - Title font size (default: clamp(3rem, 7vw, 5rem))
- `--hero-font-weight` - Title font weight (default: 900)
- `--hero-font-style` - Title font style (default: normal)
- `--hero-text-transform` - Title text transform (default: uppercase)

### Hero Subtitle
Applied to: `<p class="hero-subtitle">`

- `--hero-subtitle-text-color` - Subtitle text color (default: rgba(255, 255, 255, 0.95))
- `--hero-subtitle-font-family` - Subtitle font family (inherits from section)
- `--hero-subtitle-font-size` - Subtitle font size (default: clamp(1.1rem, 2.5vw, 1.5rem))
- `--hero-subtitle-font-weight` - Subtitle font weight (default: 500)
- `--hero-subtitle-font-style` - Subtitle font style (default: normal)

### Hero CTA Button
Applied to: `<button class="hero-cta">`

- `--hero-cta-text-color` - CTA button text color
- `--hero-cta-bg-color` - CTA button background color
- `--hero-cta-font-family` - CTA button font family (inherits from section)
- `--hero-cta-font-size` - CTA button font size (default: clamp(1.1rem, 2.5vw, 1.4rem))
- `--hero-cta-font-weight` - CTA button font weight (default: 800)
- `--hero-cta-font-style` - CTA button font style (default: normal)

## Usage in React/TypeScript

### Setting Variables Inline

```typescript
import { createSectionVars, createElementVars } from '../utils/siteStyleHelpers';

// For sections
const navigationVars = createSectionVars(navigation.style, 'nav');
<header className="login-header" style={navigationVars}>

// For elements with custom prefix
const brandVars = createElementVars(
  navigation.style,
  elementStyles['navigation.brand'],
  'nav-brand'
);
<span className="login-brand__name" style={brandVars}>
```

### Example: Custom Hero Title

```typescript
const heroTitleStyle = {
  ...getElementVars('hero.title', 'hero'),
  '--hero-text-transform': 'uppercase',
  '--hero-font-weight': 'bold',
};

<h2 className="hero-title" style={heroTitleStyle}>
  {hero.title}
</h2>
```

## ElementStyle Properties

When setting `elementStyles` in site content, you can use:

```typescript
interface ElementStyle {
  textColor?: string;        // Any valid CSS color
  backgroundColor?: string;  // Any valid CSS color
  fontFamily?: string;       // Font name (auto-quoted if needed)
  fontSize?: string;         // CSS font size (e.g., "16px", "1.2rem")
  fontWeight?: string;       // "normal", "bold", or 100-900
  fontStyle?: string;        // "normal", "italic", "oblique"
}
```

### Valid fontWeight Values
- `"normal"` - Regular weight
- `"bold"` - Bold weight
- `"100"` to `"900"` - Numeric weights (multiples of 100)

### Valid fontStyle Values
- `"normal"` - Default style
- `"italic"` - Italic style
- `"oblique"` - Oblique style

## Protected Properties

The following CSS properties are **locked** and cannot be modified through inline styles or CSS variables:

❌ **Position & Layout**
- position, top, left, right, bottom
- display, flex, grid
- width, height (when layout-critical)

❌ **Spacing** (when layout-critical)
- margin, padding

❌ **Transform & Effects**
- transform
- z-index

These properties are protected with `!important` in CSS to maintain layout integrity.

## CSS Architecture

```
┌─────────────────────────────────────────────┐
│ Component (Login.tsx)                       │
│ ↓ Generates CSS variables from props       │
├─────────────────────────────────────────────┤
│ Inline Styles                               │
│ style={{ --hero-bg-color: "#ff0000" }}     │
│ ↓ Applied to DOM elements                   │
├─────────────────────────────────────────────┤
│ CSS (globals.css)                           │
│ background-color: var(--hero-bg-color);    │
│ position: relative !important; ← locked    │
└─────────────────────────────────────────────┘
```

This architecture ensures:
1. Dynamic theming through CSS variables
2. Layout protection through CSS with !important
3. Clean separation of concerns
4. Performance optimization
