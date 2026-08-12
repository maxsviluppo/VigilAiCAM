export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    success: true,
    installed: false,
    state: 'NotAvailable',
    authUrl: null,
    ip: null,
    message: 'Tailscale VPN disponibile solo sul dispositivo VigilAI locale o Raspberry Pi.',
  });
}
