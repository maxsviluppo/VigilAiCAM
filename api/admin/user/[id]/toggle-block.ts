import { checkAdminToken, supabaseAdminFetch } from '../../../lib/supabaseAdmin';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!checkAdminToken(req, res)) return;

  const { id } = req.query;
  const { blocked } = req.body || {};

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'ID utente mancante' });
  }

  try {
    const banDuration = blocked ? '876000h' : 'none';
    const response = await supabaseAdminFetch(`admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ban_duration: banDuration }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(200).json({
        success: false,
        error: `Errore Supabase REST API: ${response.status} ${errText.slice(0, 200)}`,
      });
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[Admin Vercel] Errore toggle-block:', err.message);
    return res.status(200).json({ success: false, error: err.message || 'Errore interno' });
  }
}
