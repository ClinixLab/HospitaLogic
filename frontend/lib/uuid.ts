export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseUuid(v: string | null) {
  if (!v) return null;
  const s = v.trim();
  return UUID_RE.test(s) ? s : null;
}

export function requireUuid(v: string | null, field = "id") {
  const out = parseUuid(v);
  if (!out) throw new Error(`INVALID_${field.toUpperCase()}`);
  return out;
}
