import crypto from 'node:crypto';

/**
 * Sensitive field names that MUST be redacted from audit logs under
 * data-protection regulations (GDPR, ISO 27001, SOC 2, HIPAA).
 */
export const SENSITIVE_FIELD_NAMES = new Set<string>([
  'password',
  'passwordhash',
  'password_hash',
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'secret',
  'jwtsecret',
  'jwt_secret',
  'apikey',
  'api_key',
  'creditcard',
  'credit_card',
  'cardnumber',
  'card_number',
  'cvv',
  'cvc',
  'bankaccount',
  'bank_account',
  'iban',
  'ssn',
  'socialsecuritynumber',
  'social_security_number',
  'nationalid',
  'national_id',
  'privatekey',
  'private_key',
  'clientsecret',
  'client_secret',
]);

/**
 * Maximum character length of any string in an audit value before truncation.
 * Prevents embedding large binary / base64 payloads (e.g. inline images) in audit logs.
 */
export const MAX_AUDIT_STRING_LENGTH = 1024;

/**
 * Computes a SHA-256 fingerprint for redacted binary or large payloads.
 */
function computeSha256Fingerprint(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Detects if a string is likely a raw base64 data URI or raw binary buffer payload.
 */
function isBase64OrBinaryPayload(str: string): boolean {
  if (str.startsWith('data:') && str.includes(';base64,')) {
    return true;
  }
  // If string is long and has high density of base64 characters without whitespace
  if (str.length > 512 && /^[A-Za-z0-9+/=]+$/.test(str.slice(0, 500))) {
    return true;
  }
  return false;
}

/**
 * Recursively sanitizes an object or array before persisting it to `audit_logs`
 * oldValues or newValues JSONB columns.
 *
 * Rules:
 * 1. Redacts sensitive credentials, tokens, and personal confidential fields.
 * 2. Truncates large binary / base64 strings to informative metadata references with SHA-256 hashes.
 * 3. Serializes BigInt values safely to strings.
 * 4. Preserves operational fidelity of equipment attributes, readings, and states.
 */
export function sanitizeForAuditLog(val: unknown, depth = 0): unknown {
  if (depth > 12) {
    return '[NESTING_DEPTH_EXCEEDED]';
  }

  if (val === null || val === undefined) {
    return val;
  }

  // Handle BigInt
  if (typeof val === 'bigint') {
    return val.toString();
  }

  // Handle Dates
  if (val instanceof Date) {
    return val.toISOString();
  }

  // Handle Strings
  if (typeof val === 'string') {
    if (isBase64OrBinaryPayload(val)) {
      const hash = computeSha256Fingerprint(val);
      return `[REDACTED_BINARY_PAYLOAD: length=${val.length} chars, sha256_prefix=${hash}]`;
    }
    if (val.length > MAX_AUDIT_STRING_LENGTH) {
      const hash = computeSha256Fingerprint(val);
      return `${val.slice(0, 256)}... [TRUNCATED: total_length=${val.length}, sha256_prefix=${hash}]`;
    }
    return val;
  }

  // Handle Primitives
  if (typeof val === 'number' || typeof val === 'boolean') {
    return val;
  }

  // Handle Arrays
  if (Array.isArray(val)) {
    return val.map((item) => sanitizeForAuditLog(item, depth + 1));
  }

  // Handle Objects
  if (typeof val === 'object') {
    const sanitizedObj: Record<string, unknown> = {};

    for (const [key, propVal] of Object.entries(val)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Check if key matches sensitive patterns
      if (SENSITIVE_FIELD_NAMES.has(normalizedKey)) {
        sanitizedObj[key] = '[REDACTED_DATA_PROTECTION]';
      } else {
        sanitizedObj[key] = sanitizeForAuditLog(propVal, depth + 1);
      }
    }

    return sanitizedObj;
  }

  return String(val);
}
