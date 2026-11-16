/**
 * Public Supabase settings for job alerts (Project Settings → API).
 * The anon key is designed to be public; the database only lets it call the
 * subscribe() and unsubscribe() functions. Leave these empty to show the
 * signup form as "launching soon".
 */
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

export const alertsEnabled = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Calls a Postgres function exposed by Supabase's REST API. */
export async function callRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new Error(body?.message ?? `Request failed (${r.status})`);
  return body as T;
}
