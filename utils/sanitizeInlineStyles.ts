/**
 * Sanitize inline styles in HTML to prevent layout/position manipulation
 * while allowing safe visual customization.
 * 
 * This module ensures that user-provided rich text content can customize
 * visual appearance (colors, fonts, etc.) but cannot break the page layout
 * by injecting positioning, display, or spacing properties.
 */

/**
 * Allowlist of CSS properties that are safe for visual customization.
 * These properties affect appearance but not layout/positioning.
 */
const ALLOWED_STYLE_PROPERTIES = new Set([
  'color',
  'background-color',
  'font-weight',
  'font-style',
  'font-family',
  'font-size',
  'text-decoration',
  'line-height',
  'letter-spacing',
  'word-spacing',
  'text-transform',
  'font-variant',
]);

/**
 * Parse a CSS style string and extract only allowed properties.
 * 
 * @param styleString - Raw CSS style attribute value
 * @returns Sanitized CSS style string with only allowed properties
 */
const sanitizeStyleAttribute = (styleString: string): string => {
  if (!styleString || styleString.trim().length === 0) {
    return '';
  }

  // Parse style declarations (property: value pairs)
  const declarations = styleString
    .split(';')
    .map(decl => decl.trim())
    .filter(Boolean);

  const allowedDeclarations: string[] = [];

  declarations.forEach(declaration => {
    const colonIndex = declaration.indexOf(':');
    if (colonIndex === -1) {
      return; // Skip malformed declarations
    }

    const property = declaration.slice(0, colonIndex).trim().toLowerCase();
    const value = declaration.slice(colonIndex + 1).trim();

    // Only keep allowed properties with non-empty values
    if (ALLOWED_STYLE_PROPERTIES.has(property) && value.length > 0) {
      allowedDeclarations.push(`${property}: ${value}`);
    }
  });

  return allowedDeclarations.join('; ');
};

/**
 * Check if we're running in a browser environment with DOM support.
 */
const hasDOM = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * Sanitize inline styles in HTML content using DOM parsing.
 * This is the primary sanitization method when running in a browser.
 * 
 * @param html - Raw HTML string potentially containing unsafe inline styles
 * @returns Sanitized HTML with only safe style properties
 */
const sanitizeWithDOM = (html: string): string => {
  const template = document.createElement('template');
  template.innerHTML = html;

  // Walk through all elements and sanitize their style attributes
  const walker = document.createTreeWalker(
    template.content,
    NodeFilter.SHOW_ELEMENT,
    null
  );

  const elements: Element[] = [];
  let currentNode = walker.currentNode as Element;
  
  // Collect all elements first to avoid modifying while iterating
  while (currentNode) {
    elements.push(currentNode);
    const next = walker.nextNode();
    currentNode = next as Element;
  }

  // Sanitize style attributes on all elements
  elements.forEach(element => {
    if (element instanceof HTMLElement && element.hasAttribute('style')) {
      const styleAttr = element.getAttribute('style');
      if (styleAttr) {
        const sanitizedStyle = sanitizeStyleAttribute(styleAttr);
        
        if (sanitizedStyle.length > 0) {
          element.setAttribute('style', sanitizedStyle);
        } else {
          element.removeAttribute('style');
        }
      }
    }
  });

  return template.innerHTML;
};

/**
 * Fallback sanitization using regex for server-side or non-DOM environments.
 * Less robust than DOM-based sanitization but provides basic protection.
 * 
 * @param html - Raw HTML string potentially containing unsafe inline styles
 * @returns Sanitized HTML with style attributes removed or sanitized
 */
const sanitizeWithRegex = (html: string): string => {
  // Replace style attributes with sanitized versions
  return html.replace(/\s+style\s*=\s*["']([^"']*)["']/gi, (match, styleContent) => {
    const sanitizedStyle = sanitizeStyleAttribute(styleContent);
    return sanitizedStyle.length > 0 ? ` style="${sanitizedStyle}"` : '';
  });
};

/**
 * Sanitize inline styles in HTML content to prevent layout manipulation.
 * 
 * This function removes dangerous CSS properties that could break the page
 * layout (like position, display, margin, padding, transform) while preserving
 * safe visual properties (like color, font-family, font-size, etc.).
 * 
 * Uses DOM parsing when available (browser), falls back to regex in server environments.
 * 
 * @param html - Raw HTML string with potentially unsafe inline styles
 * @returns Sanitized HTML with only safe style properties preserved
 * 
 * @example
 * ```typescript
 * const unsafe = '<p style="position:fixed; color:red;">Text</p>';
 * const safe = sanitizeInlineStyles(unsafe);
 * // Returns: '<p style="color: red">Text</p>'
 * ```
 */
export const sanitizeInlineStyles = (html: string): string => {
  if (!html || html.trim().length === 0) {
    return '';
  }

  // Use DOM-based sanitization in browser, regex fallback otherwise
  return hasDOM ? sanitizeWithDOM(html) : sanitizeWithRegex(html);
};
