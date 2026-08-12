export const ADMIN_TOKEN = 'vigilai-admin-Max1974-123Max456';

export function checkAdminToken(req: any, res: any): boolean {
  const token = req.headers['x-admin-token'];
  if (token !== ADMIN_TOKEN) {
    res.status(403).json({ success: false, error: 'Accesso non autorizzato' });
    return false;
  }
  return true;
}

export async function supabaseAdminFetch(path: string, options: RequestInit = {}) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY o VITE_SUPABASE_URL non configurati nel file .env');
  }

  const url = `${supabaseUrl}/auth/v1/${path}`;
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
