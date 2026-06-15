import nodemailer from "nodemailer";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

// ─── TELEGRAM via Direct API (Senza OpenClaw) ─────────────────────────────────
async function sendTelegramNotification(description: string, screenshotBase64?: string, targetChatId?: string, targetBotToken?: string): Promise<void> {
  const chatId = targetChatId || process.env.TELEGRAM_CHAT_ID;
  const botToken = targetBotToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!chatId || !botToken) return;

  const timestamp = new Date().toLocaleString("it-IT");
  const message = `🚨 *ALLERTA VigilAI*\n\n📋 ${description}\n\n🕐 ${timestamp}`;

  try {
    if (screenshotBase64 && screenshotBase64.length > 100) {
      const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
      const base64Data = screenshotBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const payload = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${message}\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="screenshot.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
        buffer,
        Buffer.from(`\r\n--${boundary}--\r\n`)
      ]);

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`
        },
        body: payload
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[Telegram Vercel] API error: ${text}`);
      }
    } else {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown"
        })
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[Telegram Vercel] API error: ${text}`);
      }
    }
  } catch (err: any) {
    console.error(`[Telegram Vercel] HTTP error: ${err.message}`);
  }
}
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { screenshot, description, type, recipient, emailUser, emailPass, telegramChatId, telegramToken } = req.body;

  console.log(`[Vercel Serverless] Sending ${type} alert to: ${Array.isArray(recipient) ? recipient.join(", ") : recipient}`);

  try {
    if (type === "email") {
      const user = emailUser || process.env.EMAIL_USER;
      const pass = emailPass || process.env.EMAIL_PASS;

      if (!user || !pass) {
        return res.status(400).json({ success: false, error: "Credenziali email mancanti (emailUser/emailPass o variabili d'ambiente non impostate)" });
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

    // ── Telegram via Direct API (in parallelo all'email) ────────────────────
    sendTelegramNotification(description, screenshot, telegramChatId, telegramToken).catch((tgErr) => {
      console.error("[Telegram] Errore non gestito:", tgErr);
    });
    // ────────────────────────────────────────────────────────────────────────

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Vercel Serverless Notification error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to send notification" });
  }
}
