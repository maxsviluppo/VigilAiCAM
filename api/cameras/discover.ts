/**
 * Vercel serverless stub: la discovery ONVIF/LAN richiede il server VigilAI locale (Raspberry / npm run dev).
 * Evita 404 HTML che rompe res.json() nel browser ("Unexpected token 'T'...").
 */
export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  return res.status(503).json({
    success: false,
    localOnly: true,
    deployment: "vercel",
    cameras: [],
    devices: [],
    count: 0,
    error:
      "La scansione telecamere sulla rete locale funziona solo sul server VigilAI (Raspberry Pi o PC con npm run dev sulla stessa LAN). Apri l'app da http://IP-del-server:3088, non dalla copia su Vercel.",
  });
}
