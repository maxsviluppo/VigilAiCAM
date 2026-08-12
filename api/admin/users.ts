const ADMIN_TOKEN = 'vigilai-admin-Max1974-123Max456';

function getAdminToken(req: any): string | undefined {
  return (req.headers['x-admin-token'] || req.headers['X-Admin-Token']) as string | undefined;
}

function checkAdminToken(req: any, res: any): boolean {
  if (getAdminToken(req) !== ADMIN_TOKEN) {
    res.status(403).json({ success: false, error: 'Accesso non autorizzato' });
    return false;
  }
  return true;
}

async function supabaseAdminFetch(path: string, options: RequestInit = {}) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
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

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!checkAdminToken(req, res)) return;

  try {
    const response = await supabaseAdminFetch('admin/users?per_page=200');
    if (!response.ok) {
      const errText = await response.text();
      return res.status(200).json({
        success: false,
        error: `Errore Supabase REST API: ${response.status} ${errText.slice(0, 200)}`,
      });
    }

    const data = await response.json() as any;
    const users = (data.users || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      banned_until: u.banned_until || null,
      confirmed_at: u.confirmed_at,
      role: u.role,
    }));

    return res.status(200).json({ success: true, users });
  } catch (err: any) {
    console.error('[Admin Vercel] Errore listUsers:', err.message);
    return res.status(200).json({ success: false, error: err.message || 'Errore interno' });
  }
}
