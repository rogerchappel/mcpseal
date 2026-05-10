const secretKeyPattern = /(token|secret|password|passwd|apikey|api_key|access_key|private_key|credential|auth|bearer)/i;
const secretValuePatterns = [
  /sk-[A-Za-z0-9_-]{12,}/g,
  /gh[pousr]_[A-Za-z0-9_]{12,}/g,
  /xox[baprs]-[A-Za-z0-9-]{12,}/g,
  /eyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
  /AKIA[0-9A-Z]{12,}/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g
];

export function looksSecretKey(key: string): boolean {
  return secretKeyPattern.test(key);
}

export function redactValue(value: unknown, enabled = true): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (!enabled) return text ?? '';
  if (text == null) return '';
  let redacted = text;
  for (const pattern of secretValuePatterns) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }
  if (redacted.length > 8 && redacted !== text) return redacted;
  return redacted;
}

export function redactEnvEntry(key: string, value: unknown, enabled = true): string {
  if (!enabled) return `${key}=${redactValue(value, false)}`;
  if (looksSecretKey(key)) return `${key}=[REDACTED]`;
  return `${key}=${redactValue(value, true)}`;
}
