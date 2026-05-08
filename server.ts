import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3001;

  app.use(bodyParser.json({ limit: "10mb" }));

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
  const FFMPEG_BIN = path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe");
  const activeStreams = new Map<string, { latestFrame: Buffer | null, lastAccessed: number, process: any }>();
  
  const SOI = Buffer.from([0xFF, 0xD8]);
  const EOI = Buffer.from([0xFF, 0xD9]);

  function startStream(rtspUrl: string) {
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
