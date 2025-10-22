import { CSSProperties } from 'react';
import { ElementStyle, SectionStyle } from '../types';

export const formatFontFamily = (fontFamily?: string | null): string | undefined => {
  if (!fontFamily) {
    return fontFamily ?? undefined;
  }

  const trimmed = fontFamily.trim();

  if (trimmed.length === 0 || trimmed.includes(',')) {
    return trimmed.length === 0 ? undefined : trimmed;
  }

  const isQuoted = /^(['"]).*\1$/.test(trimmed);
  if (isQuoted) {
    return trimmed;
  }

  const needsQuoting = /[^a-zA-Z0-9-]/.test(trimmed);
  if (!needsQuoting) {
    return trimmed;
  }

  const escaped = trimmed.replace(/'/g, "\\'");
  return `'${escaped}'`;
};

export const createBackgroundStyle = (style: SectionStyle): CSSProperties => {
  if (style.background.type === 'image' && style.background.image) {
    return {
      backgroundImage: `url('${style.background.image}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundColor: style.background.color,
    };
  }

  return { backgroundColor: style.background.color };
};

export const createHeroBackgroundStyle = (
  style: SectionStyle,
  fallbackImage: string | null,
): CSSProperties => {
  const base = createBackgroundStyle(style);

  if (style.background.type === 'image') {
    const image = style.background.image ?? fallbackImage;
    if (image) {
      return {
        ...base,
        backgroundImage: `url('${image}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }
    return base;
  }

  if (fallbackImage) {
    return {
      ...base,
      backgroundImage: `url('${fallbackImage}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }

  return base;
};

export const createTextStyle = (style: SectionStyle): CSSProperties => ({
  color: style.textColor,
  fontFamily: formatFontFamily(style.fontFamily),
});

export const createBodyTextStyle = (style: SectionStyle): CSSProperties => ({
  ...createTextStyle(style),
  fontSize: style.fontSize,
});

export const createElementTextStyle = (
  sectionStyle: SectionStyle,
  elementStyle?: ElementStyle | null,
): CSSProperties => {
  const style: CSSProperties = {
    color: elementStyle?.textColor ?? sectionStyle.textColor,
    fontFamily: formatFontFamily(elementStyle?.fontFamily ?? sectionStyle.fontFamily),
  };

  if (elementStyle?.backgroundColor && elementStyle.backgroundColor.trim().length > 0) {
    style.backgroundColor = elementStyle.backgroundColor;
  }

  return style;
};

export const createElementBodyTextStyle = (
  sectionStyle: SectionStyle,
  elementStyle?: ElementStyle | null,
): CSSProperties => ({
  ...createElementTextStyle(sectionStyle, elementStyle),
  fontSize: elementStyle?.fontSize ?? sectionStyle.fontSize,
});

export const createElementBackgroundStyle = (
  _sectionStyle: SectionStyle,
  elementStyle?: ElementStyle | null,
): CSSProperties => {
  if (elementStyle?.backgroundColor) {
    return { backgroundColor: elementStyle.backgroundColor };
  }
  return {};
};

// ============================================================================
// CSS Variable-based Helpers (New approach for layout-safe theming)
// ============================================================================

/**
 * Creates CSS custom properties (variables) for section-level styling.
 * These variables can be consumed in CSS while keeping layout rules locked.
 * 
 * @param style - Section style configuration
 * @param prefix - CSS variable prefix (e.g., 'nav', 'hero')
 * @returns Object with CSS custom properties
 */
export const createSectionVars = (
  style: SectionStyle,
  prefix: string,
): CSSProperties => {
  const vars: Record<string, string> = {};

  // Background
  if (style.background.type === 'image' && style.background.image) {
    vars[`--${prefix}-bg-image`] = `url('${style.background.image}')`;
  }
  if (style.background.color) {
    vars[`--${prefix}-bg-color`] = style.background.color;
  }

  // Typography
  if (style.textColor) {
    vars[`--${prefix}-text-color`] = style.textColor;
  }
  if (style.fontFamily) {
    const formatted = formatFontFamily(style.fontFamily);
    if (formatted) {
      vars[`--${prefix}-font-family`] = formatted;
    }
  }
  if (style.fontSize) {
    vars[`--${prefix}-font-size`] = style.fontSize;
  }

  return vars as CSSProperties;
};

/**
 * Creates CSS custom properties for hero section with fallback image support.
 * 
 * @param style - Section style configuration
 * @param fallbackImage - Optional fallback background image
 * @returns Object with CSS custom properties
 */
export const createHeroVars = (
  style: SectionStyle,
  fallbackImage: string | null,
): CSSProperties => {
  const vars = createSectionVars(style, 'hero');

  // Apply fallback image if no custom image is set
  if (style.background.type !== 'image' && fallbackImage) {
    (vars as Record<string, string>)['--hero-bg-image'] = `url('${fallbackImage}')`;
  } else if (style.background.type === 'image' && !style.background.image && fallbackImage) {
    (vars as Record<string, string>)['--hero-bg-image'] = `url('${fallbackImage}')`;
  }

  return vars;
};

/**
 * Creates CSS custom properties for element-level styling.
 * Inherits from section style but allows element-specific overrides.
 * 
 * @param sectionStyle - Parent section style
 * @param elementStyle - Element-specific style overrides
 * @param prefix - CSS variable prefix (e.g., 'hero-title')
 * @returns Object with CSS custom properties
 */
export const createElementVars = (
  sectionStyle: SectionStyle,
  elementStyle: ElementStyle | null | undefined,
  prefix: string,
): CSSProperties => {
  const vars: Record<string, string> = {};

  // Text color (element overrides section)
  const textColor = elementStyle?.textColor ?? sectionStyle.textColor;
  if (textColor) {
    vars[`--${prefix}-text-color`] = textColor;
  }

  // Background color (element only)
  if (elementStyle?.backgroundColor) {
    vars[`--${prefix}-bg-color`] = elementStyle.backgroundColor;
  }

  // Font family (element overrides section)
  const fontFamily = elementStyle?.fontFamily ?? sectionStyle.fontFamily;
  if (fontFamily) {
    const formatted = formatFontFamily(fontFamily);
    if (formatted) {
      vars[`--${prefix}-font-family`] = formatted;
    }
  }

  // Font size (element overrides section)
  const fontSize = elementStyle?.fontSize ?? sectionStyle.fontSize;
  if (fontSize) {
    vars[`--${prefix}-font-size`] = fontSize;
  }

  // Font weight (element only)
  if (elementStyle?.fontWeight) {
    vars[`--${prefix}-font-weight`] = elementStyle.fontWeight;
  }

  // Font style (element only)
  if (elementStyle?.fontStyle) {
    vars[`--${prefix}-font-style`] = elementStyle.fontStyle;
  }

  return vars as CSSProperties;
};
