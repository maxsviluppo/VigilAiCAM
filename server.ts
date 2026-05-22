import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { networkInterfaces } from "os";
import ffmpeg from "ffmpeg-static";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3088;

  app.use(bodyParser.json({ limit: "10mb" }));

  // Controlla se le variabili essenziali nel file .env sono configurate
  const isConfigured = () => {
    return !!(
      process.env.GEMINI_API_KEY &&
      process.env.VITE_SUPABASE_URL &&
      process.env.VITE_SUPABASE_ANON_KEY &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS
    );
  };

  // Endpoint per salvare la configurazione iniziale da browser
  app.post("/api/setup", (req, res) => {
    try {
      const { GEMINI_API_KEY, VITE_GEMINI_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, EMAIL_USER, EMAIL_PASS } = req.body;
      
      if (!GEMINI_API_KEY || !VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY || !EMAIL_USER || !EMAIL_PASS) {
        return res.status(400).json({ success: false, error: "Tutti i campi sono obbligatori." });
      }

      const envContent = [
        `GEMINI_API_KEY=${GEMINI_API_KEY}`,
        `VITE_GEMINI_API_KEY=${VITE_GEMINI_API_KEY}`,
        `EMAIL_USER=${EMAIL_USER}`,
        `EMAIL_PASS=${EMAIL_PASS}`,
        `VITE_SUPABASE_URL=${VITE_SUPABASE_URL}`,
        `VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}`,
        `NODE_ENV=production` // Forza la modalità di produzione al riavvio
      ].join("\n");

      fs.writeFileSync(path.join(process.cwd(), ".env"), envContent, "utf-8");
      console.log("[Setup] Configurazione salvata correttamente nel file .env");
      
      res.json({ success: true });

      // Riavvia il server tramite systemd per applicare i cambiamenti
      setTimeout(() => {
        console.log("[Setup] Riavvio del processo...");
        process.exit(1); // L'uscita forzata fa riavviare il servizio da systemd
      }, 1000);

    } catch (err: any) {
      console.error("[Setup] Errore di salvataggio:", err);
      res.status(500).json({ success: false, error: err.message || "Impossibile salvare la configurazione." });
    }
  });

  // Reindirizza tutte le richieste HTML al Setup Wizard se non configurato
  app.use((req, res, next) => {
    if (!isConfigured() && !req.path.startsWith("/api/")) {
      return res.sendFile(path.join(process.cwd(), "setup_wizard.html"));
    }
    next();
  });

  // API Route for System Info (IP Discovery)
  app.get("/api/info", (req, res) => {
    console.log("[API] Info request received");
    const nets = networkInterfaces();
    const results: string[] = [];

    for (const name of Object.keys(nets)) {
      const interfaces = nets[name];
      if (interfaces) {
        for (const net of interfaces) {
          if (net.family === 'IPv4' && !net.internal) {
            results.push(net.address);
          }
        }
      }
    }
    res.json({ ips: results, port: PORT });
  });

  // API Route for Notifications
  app.post("/api/notify", async (req, res) => {
    const { screenshot, description, type, recipient, emailUser, emailPass } = req.body;

    console.log(`[Notification] Sending ${type} alert to: ${Array.isArray(recipient) ? recipient.join(", ") : recipient}`);

    try {
      if (type === "email") {
        const user = emailUser || process.env.EMAIL_USER;
        const pass = emailPass || process.env.EMAIL_PASS;

        if (!user || !pass) {
          console.error("CRITICAL: EMAIL_USER or EMAIL_PASS missing!");
          return res.status(400).json({ success: false, error: "Email credentials missing" });
        }

        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: { user, pass },
        });

        const mailOptions = {
          from: `"Vigil.AI - Sistema di Sicurezza" <${user}>`,
          to: recipient,
          subject: "🚨 ALLERTA SICUREZZA - Rilevamento Emergenza",
          text: `ATTENZIONE: Il sistema Vigil.AI ha rilevato una possibile emergenza.\n\nDettagli: ${description}\n\nData/Ora: ${new Date().toLocaleString('it-IT')}`,
          attachments: [
            {
              filename: "fotogramma_emergenza.jpg",
              content: screenshot,
              encoding: "base64",
            },
          ],
        };

        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully");
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Notification error:", error);
      res.status(500).json({ success: false, error: "Failed to send notification" });
    }
  });

  // --- IP CAMERA STREAM MANAGER ---
  const { spawn } = await import("child_process");
  const FFMPEG_BIN = ffmpeg || (process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
  const activeStreams = new Map<string, { latestFrame: Buffer | null, lastAccessed: number, process: any }>();
  
  const SOI = Buffer.from([0xFF, 0xD8]);
  const EOI = Buffer.from([0xFF, 0xD9]);

  async function startStream(rtspUrl: string) {
    console.log(`[Camera Manager] Starting FFmpeg for: ${rtspUrl.split('@')[1] || rtspUrl}`); // Hide credentials in logs
    const args = [
      '-loglevel', 'error',
      '-rtsp_transport', 'tcp',
      '-timeout', '10000000',
      '-i', rtspUrl,
      '-vf', 'fps=5,scale=1280:720',
      '-q:v', '4',
      '-f', 'mjpeg',
      'pipe:1'
    ];

    const ff = spawn(FFMPEG_BIN, args);
    let buffer = Buffer.alloc(0);

    const streamData = { 
      latestFrame: null as Buffer | null, 
      lastAccessed: Date.now(), 
      startTime: Date.now(),
      process: ff 
    };
    activeStreams.set(rtspUrl, streamData);

    const fs = await import("fs");
    const logPath = path.join(__dirname, "ffmpeg_error.log");
    const logStream = fs.createWriteStream(logPath, { flags: 'a' });
    
    ff.stderr.on('data', (data) => {
      const msg = data.toString();
      logStream.write(`[${new Date().toISOString()}] [${rtspUrl.split('@')[1]}] ${msg}`);
      if (msg.includes('error') || msg.includes('failed') || msg.includes('Invalid')) {
        console.error(`[FFmpeg Error] ${msg.trim()}`);
      }
    });

    ff.stdout.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      while (true) {
        const start = buffer.indexOf(SOI);
        if (start === -1) break;
        const end = buffer.indexOf(EOI, start + 2);
        if (end === -1) break;
        streamData.latestFrame = buffer.slice(start, end + 2);
        buffer = buffer.slice(end + 2);
      }
      if (buffer.length > 5 * 1024 * 1024) buffer = Buffer.alloc(0);
    });

    ff.on('error', (err) => {
      console.error(`[Camera Manager] Failed to start FFmpeg: ${err.message}`);
      logStream.write(`[${new Date().toISOString()}] [ERROR] ${err.message}\n`);
    });

    ff.on('close', (code: number) => {
      console.log(`[Camera Manager] FFmpeg closed for ${rtspUrl.split('@')[1] || rtspUrl} (code ${code})`);
      if (activeStreams.has(rtspUrl)) {
        setTimeout(() => {
           if (activeStreams.has(rtspUrl)) startStream(rtspUrl);
        }, 5000); // Wait longer before restart to avoid spamming
      }
    });
  }

  // Auto-cleanup idle streams every 30s
  setInterval(() => {
    const now = Date.now();
    for (const [url, stream] of activeStreams.entries()) {
      if (now - stream.lastAccessed > 60000) { // 60s idle timeout
        console.log(`[Camera Manager] Stopping idle stream: ${url}`);
        stream.process.kill();
        activeStreams.delete(url);
      }
    }
  }, 30000);

  app.get("/api/snapshot", (req, res) => {
    const rtsp = req.query.rtsp as string;
    const clientIp = req.ip || req.socket.remoteAddress;
    
    if (!rtsp) return res.status(400).json({ error: "Missing rtsp parameter" });

    if (!activeStreams.has(rtsp)) {
      console.log(`[API] Snapshot init from ${clientIp} for ${rtsp.substring(0, 30)}...`);
      startStream(rtsp);
      return res.status(503).json({ error: "Initializing stream..." });
    }

    const stream = activeStreams.get(rtsp)!;
    stream.lastAccessed = Date.now();

    if (!stream.latestFrame) {
      // Check if it's taking too long to get the first frame
      if (Date.now() - stream.startTime > 15000) {
        console.warn(`[API] Stream timeout for ${rtsp.substring(0, 30)}`);
        activeStreams.delete(rtsp);
        return res.status(504).json({ error: "Stream Timeout" });
      }
      return res.status(503).json({ error: "Waiting for first frame..." });
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.end(stream.latestFrame);
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Vigil.AI Server running on http://localhost:${PORT}`);
  });
}

startServer();
