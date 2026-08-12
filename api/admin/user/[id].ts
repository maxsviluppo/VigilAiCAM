import { checkAdminToken, supabaseAdminFetch } from '../../lib/supabaseAdmin';

export default async function handler(req: any, res: any) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!checkAdminToken(req, res)) return;

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
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
