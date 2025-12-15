export function parseUuid(v: any): string | null {
  const s = String(v ?? "").trim();

  // ✅ accept "uuid-like" (ไม่บังคับ v4)
  const ok = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
  if (!ok) return null;

  return s.toLowerCase();
}