# CSS Variable-Based Theming Implementation

## Overview

This implementation enables rich customization of the public homepage (Login.tsx) while preventing any changes to geometry and layout. The approach uses CSS custom properties (variables) for visual theming while keeping layout rules locked in CSS.

## Key Changes

### 1. Type System (types/index.ts)

Extended `ElementStyle` interface to support:
- `fontWeight?: string` - Supports 'normal', 'bold', or numeric values (100-900)
- `fontStyle?: string` - Supports 'normal', 'italic', 'oblique'

### 2. Sanitization (utils/siteContent.ts)

Updated `sanitizeElementStyle()` to:
- **Allow only visual properties**: textColor, backgroundColor, fontFamily, fontSize, fontWeight, fontStyle
- **Disallow layout properties**: position, display, transform, flex/grid, width/height, margin/padding, z-index, etc.
- **Validate fontWeight**: Only accepts 'normal', 'bold', or numeric values 100-900 (multiples of 100)
- **Validate fontStyle**: Only accepts 'normal', 'italic', 'oblique'

### 3. Style Helpers (utils/siteStyleHelpers.ts)

Added three new CSS variable generators:

#### `createSectionVars(style: SectionStyle, prefix: string)`
Returns CSS custom properties for section-level styling:
```typescript
{
  '--prefix-bg-color': '#ffffff',
  '--prefix-bg-image': "url('...')",
  '--prefix-text-color': '#000000',
  '--prefix-font-family': 'Arial',
  '--prefix-font-size': '16px'
}
```

#### `createHeroVars(style: SectionStyle, fallbackImage: string | null)`
Similar to `createSectionVars` but with fallback image support for the hero section.

#### `createElementVars(sectionStyle: SectionStyle, elementStyle: ElementStyle | null, prefix: string)`
Returns CSS variables for element-specific styling with inheritance from section:
```typescript
{
  '--prefix-text-color': '#ff0000',
  '--prefix-bg-color': '#f0f0f0',
  '--prefix-font-family': 'Arial',
  '--prefix-font-size': '20px',
  '--prefix-font-weight': 'bold',
  '--prefix-font-style': 'italic'
}
```

### 4. CSS Consumption (styles/globals.css)

Updated critical sections to consume CSS variables:

#### Navigation Header
```css
.login-header {
  /* Layout locked */
  position: relative !important;
  top: auto !important;
  padding-block: clamp(0.5rem, 1vw, 0.7rem) !important;
  
  /* Customizable via CSS variables */
  background-color: var(--nav-bg-color, #0f172a);
  color: var(--nav-text-color, #e2e8f0);
  font-family: var(--nav-font-family, Inter, ui-sans-serif, system-ui, sans-serif);
}
```

#### Hero Section
```css
.section-hero {
  /* Layout locked */
  position: relative !important;
  
  /* Customizable via CSS variables */
  color: var(--hero-text-color, var(--color-surface));
  background-color: var(--hero-bg-color, #0f172a);
  background-image: var(--hero-bg-image);
}

.hero-title {
  /* Customizable */
  font-size: var(--hero-font-size, clamp(3rem, 7vw, 5rem)) !important;
  font-weight: var(--hero-font-weight, 900) !important;
  font-style: var(--hero-font-style, normal) !important;
  text-transform: var(--hero-text-transform, uppercase) !important;
  
  /* Layout locked */
  line-height: 1 !important;
  margin: 0 !important;
}
```

### 5. Runtime Usage (pages/Login.tsx)

Updated Login component to inject CSS variables:

```typescript
// Create CSS variables for sections
const navigationVars = createSectionVars(navigation.style, 'nav');
const heroVars = createHeroVars(hero.style, hero.backgroundImage);

// Helper for element-specific variables
const getElementVars = (key: EditableElementKey, prefix: string) => {
  const zone = resolveZoneFromElement(key);
  return createElementVars(zoneStyleMap[zone], getElementStyle(key), prefix);
};

// Apply in JSX
<header className="login-header" style={navigationVars}>
  <div className="login-brand">
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
</header>

<section className="section-hero" style={heroVars}>
  <div className="hero-content">
    <h2 
      className="hero-title" 
      style={{ 
        ...getElementVars('hero.title', 'hero'),
        '--hero-text-transform': 'uppercase'
      }}
    >
      {hero.title}
    </h2>
  </div>
</section>
```

## Security & Layout Protection

### Why !important is used

1. **Prevents content-driven layout changes**: Content authors cannot override position, display, or other layout-critical properties
2. **Blocks sticky/fixed positioning**: Ensures `position: relative !important` cannot be changed
3. **Maintains responsive design**: Padding and other responsive values are protected

### What can be customized

✅ **Visual Properties** (safe to customize):
- Colors (text, background)
- Background images
- Font family (including custom uploaded fonts)
- Font size
- Font weight (normal, bold, 100-900)
- Font style (normal, italic, oblique)

❌ **Layout Properties** (blocked):
- position, top, left, right, bottom
- display, flex, grid
- transform
- width, height (when layout-critical)
- margin, padding (when layout-critical)
- z-index
- Any other geometry-affecting properties

## Backward Compatibility

- Existing helper functions (`createBackgroundStyle`, `createTextStyle`, etc.) remain unchanged
- SiteCustomization and SitePreviewCanvas continue to use legacy helpers
- Only Login.tsx (runtime page) uses the new variable-based approach
- Gradual migration path available for other components

## Testing

Created comprehensive test coverage:

### siteStyleHelpers.test.ts
- Tests for `createSectionVars` with color and image backgrounds
- Tests for `createHeroVars` with fallback image handling
- Tests for `createElementVars` with inheritance and overrides
- Tests for font-family formatting with special characters

### siteContent.test.ts (additions)
- Validation of fontWeight values (valid: normal, bold, 100-900)
- Validation of fontStyle values (valid: normal, italic, oblique)
- Rejection of invalid values
- Stripping of disallowed layout properties
- Whitespace trimming

## Benefits

1. **Security**: Content authors cannot break layout or inject malicious positioning
2. **Maintainability**: Layout rules are centralized in CSS, not scattered in inline styles
3. **Performance**: CSS variables are more performant than large inline style objects
4. **Flexibility**: Easy to add new customizable properties without touching layout
5. **Developer Experience**: Clear separation between visual theming and layout structure

## Future Enhancements

Potential additions (not implemented in this PR):
- Variable-based theming for remaining sections (About, Menu, FindUs, Footer)
- Additional customization points (letter-spacing, line-height where safe)
- Theme presets using CSS variable sets
- Dark mode support via variable overrides
