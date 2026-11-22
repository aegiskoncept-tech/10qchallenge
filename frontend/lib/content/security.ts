// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 13: CONTENT SECURITY & SANITIZATION LAYER
// ==============================================================================

import crypto from 'crypto';

/**
 * Permitted HTML tags for blog editorial body
 */
const ALLOWED_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'mark',
  'a',
  'ul', 'ol', 'li',
  'blockquote', 'code', 'pre',
  'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'span', 'div',
]);

/**
 * Permitted attributes per tag
 */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height', 'loading']),
  th: new Set(['colspan', 'rowspan', 'scope', 'align']),
  td: new Set(['colspan', 'rowspan', 'align']),
  code: new Set(['class']),
  pre: new Set(['class']),
  span: new Set(['class']),
  div: new Set(['class']),
};

/**
 * Sanitizes untrusted HTML string to prevent Stored / Reflected XSS
 */
export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  // 1. Remove dangerous blocks entirely including content
  let cleaned = rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<math\b[^<]*(?:(?!<\/math>)<[^<]*)*<\/math>/gi, '');

  // 2. Parse and filter tags
  cleaned = cleaned.replace(/<\/?([a-zA-Z0-9\-]+)([^>]*)>/g, (match, tagName, rawAttrs) => {
    const tag = tagName.toLowerCase();
    const isClosing = match.startsWith('</');

    // If tag not allowed, strip it entirely
    if (!ALLOWED_TAGS.has(tag)) {
      return '';
    }

    if (isClosing) {
      return `</${tag}>`;
    }

    // Filter attributes
    const allowedTagAttrs = ALLOWED_ATTRS[tag] || new Set();
    const safeAttrs: string[] = [];

    // Match attribute pairs: attr="val" or attr='val' or attr=val
    const attrRegex = /([a-zA-Z0-9\-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let attrMatch;

    while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrVal = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';

      // Reject all event handlers (on*)
      if (attrName.startsWith('on')) continue;

      // Only allow approved attributes for this tag
      if (!allowedTagAttrs.has(attrName)) continue;

      // Validate URL schemes on href and src
      if (attrName === 'href' || attrName === 'src') {
        const trimmedVal = attrVal.trim().toLowerCase();
        // Disallow dangerous schemes
        if (
          trimmedVal.startsWith('javascript:') ||
          trimmedVal.startsWith('vbscript:') ||
          trimmedVal.startsWith('data:text') ||
          trimmedVal.startsWith('data:application')
        ) {
          continue;
        }
      }

      // Automatically enforce safe rel for external links
      if (tag === 'a' && attrName === 'href' && (attrVal.startsWith('http://') || attrVal.startsWith('https://'))) {
        safeAttrs.push(`rel="noopener noreferrer"`);
      }

      // Escape quotes in attribute value
      const escapedVal = attrVal.replace(/"/g, '&quot;');
      safeAttrs.push(`${attrName}="${escapedVal}"`);
    }

    // Self-closing tags
    const isSelfClosing = tag === 'img' || tag === 'br' || tag === 'hr';
    return `<${tag}${safeAttrs.length ? ' ' + safeAttrs.join(' ') : ''}${isSelfClosing ? ' /' : ''}>`;
  });

  return cleaned;
}

/**
 * Validates a slug against URL-safe regex
 * Requirements: 2-100 characters, lowercase alphanumeric and hyphens, no consecutive hyphens
 */
export function validateSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  if (slug.length < 2 || slug.length > 100) return false;
  // Regex: starts with alphanumeric, contains only alphanumeric and single hyphens, ends with alphanumeric
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Generates a clean URL slug from title
 */
export function generateSlug(title: string): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

/**
 * Calculates SHA-256 hash of content string
 */
export function calculateContentSha256(content: string): string {
  return crypto.createHash('sha256').update(content || '', 'utf8').digest('hex');
}

/**
 * Generates cryptographically secure random token (hex)
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generates a cryptographically strong UUID-based worker identity
 * Unique across distributed operating system processes and hosts
 */
export function generateWorkerIdentity(prefix = 'worker'): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/**
 * Generates HMAC-SHA256 signature for internal payload
 */
export function generateHmacSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Timing-safe HMAC-SHA256 signature verification
 */
export function verifyHmacSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !payload || !secret) return false;

  try {
    const expected = generateHmacSignature(payload, secret);
    const expectedBuf = Buffer.from(expected, 'hex');
    const actualBuf = Buffer.from(signature, 'hex');

    if (expectedBuf.length !== actualBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch (err) {
    return false;
  }
}

/**
 * Input validation for blog create/update requests
 */
export function validateBlogInput(input: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Request body must be a valid JSON object.'] };
  }

  if (!input.title || typeof input.title !== 'string' || input.title.trim().length < 3) {
    errors.push('Title is required and must be at least 3 characters.');
  }

  if (input.slug && !validateSlug(input.slug)) {
    errors.push('Slug must be 2-100 characters containing only lowercase letters, numbers, and single hyphens.');
  }

  if (!input.content || typeof input.content !== 'string' || input.content.trim().length < 10) {
    errors.push('Content is required and must be at least 10 characters.');
  }

  if (!input.excerpt || typeof input.excerpt !== 'string' || input.excerpt.trim().length < 5) {
    errors.push('Excerpt is required and must be at least 5 characters.');
  }

  if (!input.category || typeof input.category !== 'string' || input.category.trim().length === 0) {
    errors.push('Category is required.');
  }

  if (!input.author || typeof input.author !== 'string' || input.author.trim().length === 0) {
    errors.push('Author is required.');
  }

  const validStatuses = ['Draft', 'In Review', 'Approved', 'Scheduled', 'Publishing', 'Published', 'Archived', 'Failed'];
  if (input.status && !validStatuses.includes(input.status)) {
    errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
  }

  if (input.status === 'Scheduled' && !input.scheduledPublishAt) {
    errors.push('scheduledPublishAt timestamp is required when status is Scheduled.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * F13-02 Remediation: Safely serializes an object into a JSON string for HTML <script> embedding.
 * Neutralizes HTML script-closing sequences (</script>, </ScRiPt>), opening tags, ampersands,
 * and dangerous Unicode separators (U+2028 LINE SEPARATOR, U+2029 PARAGRAPH SEPARATOR).
 *
 * Escapes:
 *   '<' -> '\u003c' (neutralizes any script tag closing or injection)
 *   '>' -> '\u003e'
 *   '&' -> '\u0026'
 *   '\u2028' -> '\u2028'
 *   '\u2029' -> '\u2029'
 *
 * Conforms to Google Search Central Structured Data specifications and W3C HTML script parsing rules.
 */
export { serializeJsonLd } from './json-ld';

/**
 * F13-01 Remediation: Computes SHA-256 cryptographic hash of raw preview token.
 * Only the hash is ever stored in the database; raw tokens are never persisted or logged.
 */
export function hashPreviewToken(rawToken: string): string {
  if (!rawToken || typeof rawToken !== 'string') return '';
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

/**
 * Generates a cryptographically strong preview token with 256 bits of entropy.
 */
export function generateSecurePreviewToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

