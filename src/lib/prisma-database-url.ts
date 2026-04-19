/**
 * Supabase transaction pooler (PgBouncer) does not support server-side prepared
 * statements across pooled connections. Prisma must use `pgbouncer=true` so it
 * disables prepared statements for that URL (see Prisma + Supabase docs).
 */
export function resolvePrismaDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const looksLikeSupabasePooler =
    /pooler\.supabase\.(com|co)\b/i.test(url) ||
    (/supabase\.(com|co)\b/i.test(url) && /:6543(\/|$|\?)/.test(url));
  if (looksLikeSupabasePooler && !/(\?|&)pgbouncer=true\b/.test(url)) {
    return url.includes("?") ? `${url}&pgbouncer=true` : `${url}?pgbouncer=true`;
  }
  return url;
}
