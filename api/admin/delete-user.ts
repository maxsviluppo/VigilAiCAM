const ADMIN_TOKEN = 'vigilai-admin-Max1974-123Max456';

function getAdminToken(req: any): string | undefined {
  return (req.headers['x-admin-token'] || req.headers['X-Admin-Token']) as string | undefined;
}

function readBody(req: any): any {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
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
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (getAdminToken(req) !== ADMIN_TOKEN) {
    return res.status(403).json({ success: false, error: 'Accesso non autorizzato' });
  }

  const body = readBody(req);
  const queryId = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
  const id = typeof body.id === 'string' ? body.id : (typeof queryId === 'string' ? queryId : '');

  if (!id) {
    return res.status(400).json({ success: false, error: 'ID utente mancante' });
  }

  try {
    const response = await supabaseAdminFetch(`admin/users/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const errText = await response.text();
      return res.status(200).json({
        success: false,
        error: `Errore Supabase REST API: ${response.status} ${errText.slice(0, 200)}`,
      });
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[Admin Vercel] Errore deleteUser:', err.message);
    return res.status(200).json({ success: false, error: err.message || 'Errore interno' });
  }
}
