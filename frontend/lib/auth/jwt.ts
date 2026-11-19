// Edge-compatible JWT Implementation using Web Crypto API (SubtleCrypto)
// Runs transparently in Next.js Edge Middleware and Node.js API Route Handlers

export const AUTH_COOKIE_NAME = '10q_auth_token';
export const CSRF_COOKIE_NAME = '10q_csrf_token';

const DEFAULT_SECRET = '10QChallenge_SecureKey_SuperSecret_2026_Minimum256BitsLongRequired!';

function getJwtSecret(): string {
  return process.env.JWT_SECRET || DEFAULT_SECRET;
}

export interface JwtPayload {
  userId: number;
  email: string;
  role: 'ADMIN' | 'STUDENT' | 'FACULTY';
  sessionId: string;
  fullName: string;
  iat?: number;
  exp?: number;
}

function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signJwt(payload: JwtPayload, expiresInSeconds: number = 7 * 24 * 3600): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encoder = new TextEncoder();
  const encodedHeader = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(fullPayload)));

  const message = `${encodedHeader}.${encodedPayload}`;
  const key = await getCryptoKey(getJwtSecret());
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const encodedSignature = base64UrlEncode(signature);

  return `${message}.${encodedSignature}`;
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  if (!token || typeof token !== 'string') return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const message = `${encodedHeader}.${encodedPayload}`;

    const key = await getCryptoKey(getJwtSecret());
    const signature = base64UrlDecode(encodedSignature);
    const encoder = new TextEncoder();

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature as any,
      encoder.encode(message)
    );

    if (!isValid) return null;

    const payloadJson = new TextDecoder().decode(base64UrlDecode(encodedPayload));
    const payload = JSON.parse(payloadJson) as JwtPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired token
    }

    return payload;
  } catch (error) {
    return null;
  }
}
