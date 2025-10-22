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

/**
 * Create background style for sections.
 * Only returns backgroundColor and backgroundImage as inline styles.
 * Background size, position, and repeat are controlled by CSS classes to prevent
 * content from overriding layout behavior via inline styles.
 */
export const createBackgroundStyle = (style: SectionStyle): CSSProperties => {
  if (style.background.type === 'image' && style.background.image) {
    return {
      backgroundImage: `url('${style.background.image}')`,
      backgroundColor: style.background.color,
    };
  }

  return { backgroundColor: style.background.color };
};

/**
 * Create hero background style with fallback image support.
 * Only returns backgroundColor and backgroundImage as inline styles.
 * Background size, position, and repeat are controlled by CSS classes to prevent
 * content from overriding layout behavior via inline styles.
 */
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
      };
    }
    return base;
  }

  if (fallbackImage) {
    return {
      ...base,
      backgroundImage: `url('${fallbackImage}')`,
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

/**
 * Create text style for individual elements with optional per-element overrides.
 * Supports fontWeight and fontStyle for bold/italic customization without layout impact.
 */
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

  // Support fontWeight for bold customization
  if (elementStyle?.fontWeight && elementStyle.fontWeight.trim().length > 0) {
    style.fontWeight = elementStyle.fontWeight;
  }

  // Support fontStyle for italic customization
  if (elementStyle?.fontStyle && elementStyle.fontStyle.trim().length > 0) {
    style.fontStyle = elementStyle.fontStyle;
  }

  return style;
};

/**
 * Create body text style for individual elements with optional per-element overrides.
 * Includes fontSize in addition to text styling.
 * Supports fontWeight and fontStyle for bold/italic customization without layout impact.
 */
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
