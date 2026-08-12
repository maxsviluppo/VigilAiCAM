import { checkAdminToken, supabaseAdminFetch } from '../lib/supabaseAdmin';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
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
