import crypto from 'crypto';

const SCRYPT_CONFIG = {
  N: 16384, // CPU/memory cost parameter (2^14)
  r: 8,     // Block size parameter
  p: 1,     // Parallelization parameter
  maxmem: 32 * 1024 * 1024,
};

const KEY_LENGTH = 64; // 64-byte derived key

export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a valid non-empty string.');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(
    password,
    salt,
    KEY_LENGTH,
    SCRYPT_CONFIG
  );

  return `scrypt$N=${SCRYPT_CONFIG.N},r=${SCRYPT_CONFIG.r},p=${SCRYPT_CONFIG.p}$${salt}$${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash || typeof password !== 'string' || typeof storedHash !== 'string') {
    return false;
  }

  try {
    const parts = storedHash.split('$');
    if (parts.length !== 4 || parts[0] !== 'scrypt') {
      return false;
    }

    const salt = parts[2];
    const expectedHashHex = parts[3];
    const expectedBuffer = Buffer.from(expectedHashHex, 'hex');

    const derivedBuffer = crypto.scryptSync(
      password,
      salt,
      expectedBuffer.length,
      SCRYPT_CONFIG
    );

    if (derivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(derivedBuffer, expectedBuffer);
  } catch (error) {
    return false;
  }
}

export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, reason: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long.' };
  }
  if (password.length > 128) {
    return { valid: false, reason: 'Password must not exceed 128 characters.' };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one letter and one number.' };
  }
  return { valid: true };
}
