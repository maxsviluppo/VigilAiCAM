export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const forwardedHost = req.headers['x-forwarded-host'] as string | undefined;
  const host = (forwardedHost || req.headers.host || 'vigil-ai-cam.vercel.app').split(':')[0];

  return res.status(200).json({
    ips: [host],
    port: 443,
    deployment: 'vercel',
  });
}
