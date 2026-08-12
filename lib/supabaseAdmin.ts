export const ADMIN_TOKEN = 'vigilai-admin-Max1974-123Max456';

export function getAdminToken(req: any): string | undefined {
  return (req.headers['x-admin-token'] || req.headers['X-Admin-Token']) as string | undefined;
}

export function checkAdminToken(req: any, res: any): boolean {
  if (getAdminToken(req) !== ADMIN_TOKEN) {
    res.status(403).json({ success: false, error: 'Accesso non autorizzato' });
    return false;
  }
  return true;
}

export function getSupabaseUrl(): string {
  return process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
}

export async function supabaseAdminFetch(path: string, options: RequestInit = {}) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = getSupabaseUrl();
  if (!serviceKey || !supabaseUrl) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY o VITE_SUPABASE_URL non configurati su Vercel');
  }

  const url = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/${path}`;
  return fetch(url, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}
