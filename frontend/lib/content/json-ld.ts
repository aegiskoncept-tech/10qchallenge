// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 13: SAFE JSON-LD SERIALIZER (SINGLE SOURCE OF TRUTH)
// ==============================================================================
// Prevents HTML script tag breakout attacks (DOM XSS) when embedding dynamic
// JSON-LD structured data inside <script type="application/ld+json">.
//
// Complies with:
// - W3C HTML script parsing rules (neutralizes all </script> variations)
// - Google Search Central Structured Data specifications
// - ECMAScript JSON specifications (preserves exact object semantics upon parse)
// ==============================================================================

/**
 * Safely serializes an object into a JSON string for HTML <script> embedding.
 *
 * Replaces:
 *   '<'      -> '\u003c' (neutralizes </script>, </ScRiPt>, <script>, <img>, etc.)
 *   '>'      -> '\u003e'
 *   '&'      -> '\u0026'
 *   '\u2028' -> '\u2028' (U+2028 LINE SEPARATOR: causes syntax errors in JS)
 *   '\u2029' -> '\u2029' (U+2029 PARAGRAPH SEPARATOR)
 *
 * @param data Data object to serialize
 * @returns Safe JSON string containing zero literal '<' or '>' characters
 */
export function serializeJsonLd(data: unknown): string {
  if (data === null || data === undefined) return '{}';
  const jsonString = JSON.stringify(data);
  if (!jsonString) return '{}';

  return jsonString
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export default serializeJsonLd;
