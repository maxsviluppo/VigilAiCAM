import nodemailer from "nodemailer";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { screenshot, description, type, recipient, emailUser, emailPass } = req.body;
  const DEFAULT_SMTP_USER = "allarme.vigilai@gmail.com";
  const DEFAULT_SMTP_PASS = "jkcrqzcfbkjpsych";

  console.log(`[Vercel Serverless] Sending ${type} alert to: ${Array.isArray(recipient) ? recipient.join(", ") : recipient}`);

  try {
    if (type === "email") {
      const user = emailUser || process.env.EMAIL_USER || DEFAULT_SMTP_USER;
      const pass = emailPass || process.env.EMAIL_PASS || DEFAULT_SMTP_PASS;

      if (!user || !pass) {
        return res.status(400).json({ success: false, error: "Email credentials missing" });
      }

      // Auto-detect or override host
      let host = process.env.EMAIL_HOST || "smtp.gmail.com";
      let port = parseInt(process.env.EMAIL_PORT || "465", 10);
      let secure = process.env.EMAIL_SECURE !== "false";

      if (!process.env.EMAIL_HOST && user) {
        const emailLower = user.toLowerCase().trim();
        if (emailLower.endsWith('@gmail.com')) {
          host = 'smtp.gmail.com'; port = 465; secure = true;
        } else if (emailLower.endsWith('@libero.it')) {
          host = 'smtp.libero.it'; port = 465; secure = true;
        } else if (emailLower.endsWith('@virgilio.it')) {
          host = 'out.virgilio.it'; port = 465; secure = true;
        } else if (emailLower.endsWith('@tiscali.it')) {
          host = 'smtp.tiscali.it'; port = 465; secure = true;
        } else if (emailLower.endsWith('@fastwebnet.it')) {
          host = 'smtp.fastwebnet.it'; port = 587; secure = false;
        } else if (emailLower.endsWith('@outlook.com') || emailLower.endsWith('@hotmail.com') || emailLower.endsWith('@hotmail.it') || emailLower.endsWith('@live.it')) {
          host = 'smtp.office365.com'; port = 587; secure = false;
        } else if (emailLower.endsWith('@yahoo.com') || emailLower.endsWith('@yahoo.it')) {
          host = 'smtp.mail.yahoo.com'; port = 465; secure = true;
        }
      }

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: {
          rejectUnauthorized: false
        }
      });

      const mailOptions: any = {
        from: `"Vigil.AI - Sistema di Sicurezza" <${user}>`,
        to: recipient,
        subject: "🚨 ALLERTA SICUREZZA - Rilevamento Emergenza",
        text: `ATTENZIONE: Il sistema Vigil.AI ha rilevato una possibile emergenza.\n\nDettagli: ${description}\n\nData/Ora: ${new Date().toLocaleString('it-IT')}`,
      };

      // Attach screenshot only if provided
      if (screenshot && screenshot.length > 100) {
        mailOptions.attachments = [
          {
            filename: "fotogramma_emergenza.jpg",
            content: screenshot,
            encoding: "base64",
          },
        ];
      }

      await transporter.sendMail(mailOptions);
    }
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Vercel Serverless Notification error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to send notification" });
  }
}
