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
import { exec, spawn } from "child_process";
import net from "net";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3088;

  // Sincronizza eventuali aggiornamenti dalla partizione di BOOT (visibile da Windows)
  const syncFromBoot = () => {
    const bootPaths = ["/boot/firmware", "/boot"];
    const filesToSync = ["setup_wizard.html", "server.ts", "package.json"];
    for (const basePath of bootPaths) {
      try {
        if (fs.existsSync(basePath)) {
          for (const file of filesToSync) {
            const srcPath = path.join(basePath, file);
            if (fs.existsSync(srcPath)) {
              console.log(`[Boot Sync] Rilevato file ${file} in ${basePath}, copia in corso...`);
              const destPath = path.join(process.cwd(), file);
              fs.copyFileSync(srcPath, destPath);
              try {
                fs.unlinkSync(srcPath);
              } catch (unlinkErr: any) {
                console.warn(`[Boot Sync] Impossibile eliminare ${srcPath} dopo la copia (errore permessi): ${unlinkErr.message}`);
              }
              console.log(`[Boot Sync] File ${file} aggiornato con successo.`);
            }
          }
        }
      } catch (err: any) {
        console.error(`[Boot Sync Error] Errore durante la copia da ${basePath}:`, err.message);
      }
    }
  };
  syncFromBoot();

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

  const hasNetworkConnection = (): boolean => {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      const interfaces = nets[name];
      if (interfaces) {
        for (const netInfo of interfaces) {
          if (netInfo.family === 'IPv4' && !netInfo.internal) {
            if (netInfo.address !== '10.42.0.1') {
              return true;
            }
          }
        }
      }
    }
    return false;
  };

  const syncPendingCameras = async () => {
    const pendingFile = path.join(process.cwd(), "pending_cameras.json");
    if (!fs.existsSync(pendingFile)) {
      return;
    }

    console.log("[Sync] Rilevate telecamere pendenti da sincronizzare.");

    const trySync = async () => {
      if (!hasNetworkConnection()) {
        console.log("[Sync] Rete non disponibile. Nuovo tentativo tra 10 secondi...");
        setTimeout(trySync, 10000);
        return;
      }

      try {
        const dataStr = fs.readFileSync(pendingFile, "utf-8");
        const cameras = JSON.parse(dataStr);

        if (!Array.isArray(cameras) || cameras.length === 0) {
          console.log("[Sync] Nessuna telecamera valida nel file. Eliminazione file.");
          fs.unlinkSync(pendingFile);
          return;
        }

        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          console.error("[Sync] Errore: Credenziali Supabase mancanti in .env. Riprovo tra 10 secondi...");
          setTimeout(trySync, 10000);
          return;
        }

        console.log(`[Sync] Connessione di rete rilevata. Sincronizzazione di ${cameras.length} telecamere su Supabase...`);
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const cleanCameras = cameras.map((cam: any) => {
          const { id, ...rest } = cam;
          return rest;
        });

        const { error } = await supabase.from("cameras").insert(cleanCameras);
        if (error) {
          throw new Error(`Errore inserimento Supabase: ${error.message}`);
        }

        console.log("[Sync] Sincronizzazione completata con successo. Eliminazione file pending_cameras.json.");
        fs.unlinkSync(pendingFile);
      } catch (err: any) {
        console.error("[Sync] Errore durante la sincronizzazione:", err.message);
        console.log("[Sync] Riprovo tra 30 secondi...");
        setTimeout(trySync, 30000);
      }
    };

    trySync();
  };

  // Funzioni helper per la scansione delle telecamere IP
  function getLocalSubnet() {
    const nets = networkInterfaces();
    // Filtriamo prima le interfacce non hotspot per trovare la rete principale
    for (const name of Object.keys(nets)) {
      const interfaces = nets[name];
      if (interfaces) {
        for (const netInfo of interfaces) {
          if (netInfo.family === 'IPv4' && !netInfo.internal) {
            const parts = netInfo.address.split('.');
            if (parts.length === 4) {
              const subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
              if (subnet !== '10.42.0') {
                return subnet;
              }
            }
          }
        }
      }
    }
    // Fallback su qualsiasi interfaccia IPv4 non interna
    for (const name of Object.keys(nets)) {
      const interfaces = nets[name];
      if (interfaces) {
        for (const netInfo of interfaces) {
          if (netInfo.family === 'IPv4' && !netInfo.internal) {
            const parts = netInfo.address.split('.');
            if (parts.length === 4) {
              return `${parts[0]}.${parts[1]}.${parts[2]}`;
            }
          }
        }
      }
    }
    return null;
  }

  function checkPort(ip: string, port: number, timeout = 300): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);
      
      socket.connect(port, ip, () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
    });
  }

  // Endpoint per salvare la configurazione iniziale da browser
  app.post("/api/setup", (req, res) => {
    try {
      const { 
        GEMINI_API_KEY, 
        VITE_GEMINI_API_KEY, 
        VITE_SUPABASE_URL, 
        VITE_SUPABASE_ANON_KEY, 
        EMAIL_USER, 
        EMAIL_PASS,
        NOTIFICATION_EMAILS,
        WIFI_SSID,
        WIFI_PASSWORD,
        cameras
      } = req.body;
      
      if (!GEMINI_API_KEY || !VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY || !EMAIL_USER || !EMAIL_PASS) {
        return res.status(400).json({ success: false, error: "Tutti i campi sono obbligatori." });
      }

      // Imposta immediatamente in memoria
      process.env.GEMINI_API_KEY = GEMINI_API_KEY;
      process.env.VITE_GEMINI_API_KEY = VITE_GEMINI_API_KEY;
      process.env.EMAIL_USER = EMAIL_USER;
      process.env.EMAIL_PASS = EMAIL_PASS;
      process.env.VITE_SUPABASE_URL = VITE_SUPABASE_URL;
      process.env.VITE_SUPABASE_ANON_KEY = VITE_SUPABASE_ANON_KEY;
      if (NOTIFICATION_EMAILS) {
        process.env.NOTIFICATION_EMAILS = NOTIFICATION_EMAILS;
      }

      const envContent = [
        `GEMINI_API_KEY=${GEMINI_API_KEY}`,
        `VITE_GEMINI_API_KEY=${VITE_GEMINI_API_KEY}`,
        `EMAIL_USER=${EMAIL_USER}`,
        `EMAIL_PASS=${EMAIL_PASS}`,
        `NOTIFICATION_EMAILS=${NOTIFICATION_EMAILS || "castromassimo@gmail.com"}`,
        `VITE_SUPABASE_URL=${VITE_SUPABASE_URL}`,
        `VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}`,
        `NODE_ENV=production` // Forza la modalità di produzione al riavvio
      ].join("\n");

      fs.writeFileSync(path.join(process.cwd(), ".env"), envContent, "utf-8");
      console.log("[Setup] Configurazione salvata correttamente nel file .env");

      // Salva le telecamere pendenti in un file locale JSON
      if (cameras && Array.isArray(cameras)) {
        fs.writeFileSync(path.join(process.cwd(), "pending_cameras.json"), JSON.stringify(cameras, null, 2), "utf-8");
        console.log("[Setup] Salvate telecamere pendenti in pending_cameras.json");
      }
      
      res.json({ success: true });

      // Riavvia il server tramite systemd per applicare i cambiamenti e connettersi al WiFi
      setTimeout(() => {
        console.log("[Setup] Arresto hotspot e connessione al WiFi locale...");
        if (process.platform !== "win32") {
          exec("sudo ./scripts/setup_ap.sh stop", (err) => {
            if (err) console.error("[Setup] Errore durante l'arresto dell'hotspot:", err);
            
            if (WIFI_SSID) {
              const escapedSsid = WIFI_SSID.replace(/(["`$\\])/g, '\\$1');
              const escapedPassword = WIFI_PASSWORD ? WIFI_PASSWORD.replace(/(["`$\\])/g, '\\$1') : "";
              const connectCmd = WIFI_PASSWORD 
                ? `sudo nmcli dev wifi connect "${escapedSsid}" password "${escapedPassword}"`
                : `sudo nmcli dev wifi connect "${escapedSsid}"`;
              
              console.log(`[Setup] Connessione a SSID: ${WIFI_SSID} in corso...`);
              exec(connectCmd, (connErr) => {
                if (connErr) console.error("[Setup] Errore connessione Wi-Fi:", connErr);
                process.exit(1);
              });
            } else {
              process.exit(1);
            }
          });
        } else {
          process.exit(1);
        }
      }, 1000);

    } catch (err: any) {
      console.error("[Setup] Errore di salvataggio:", err);
      res.status(500).json({ success: false, error: err.message || "Impossibile salvare la configurazione." });
    }
  });

  // API per leggere le impostazioni correnti (Gemini Key, SMTP e Email Destinatari)
  app.get("/api/settings", (req, res) => {
    try {
      res.json({
        success: true,
        geminiKey: process.env.GEMINI_API_KEY || "",
        emailUser: process.env.EMAIL_USER || "",
        emailPass: process.env.EMAIL_PASS || "",
        notificationEmails: process.env.NOTIFICATION_EMAILS 
          ? process.env.NOTIFICATION_EMAILS.split(",").map(e => e.trim()).filter(Boolean)
          : ["castromassimo@gmail.com"],
        supabaseUrl: process.env.VITE_SUPABASE_URL || "",
        supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || ""
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API per salvare le impostazioni dal pannello di controllo dell'app
  app.post("/api/settings", (req, res) => {
    try {
      const { geminiKey, emailUser, emailPass, notificationEmails, supabaseUrl, supabaseAnonKey } = req.body;

      if (geminiKey !== undefined) {
        process.env.GEMINI_API_KEY = geminiKey;
        process.env.VITE_GEMINI_API_KEY = geminiKey;
      }
      if (emailUser !== undefined) process.env.EMAIL_USER = emailUser;
      if (emailPass !== undefined) process.env.EMAIL_PASS = emailPass;
      if (notificationEmails !== undefined) {
        process.env.NOTIFICATION_EMAILS = Array.isArray(notificationEmails)
          ? notificationEmails.join(",")
          : notificationEmails;
      }
      if (supabaseUrl !== undefined) process.env.VITE_SUPABASE_URL = supabaseUrl;
      if (supabaseAnonKey !== undefined) process.env.VITE_SUPABASE_ANON_KEY = supabaseAnonKey;

      const envContent = [
        `GEMINI_API_KEY=${process.env.GEMINI_API_KEY || ""}`,
        `VITE_GEMINI_API_KEY=${process.env.VITE_GEMINI_API_KEY || ""}`,
        `EMAIL_USER=${process.env.EMAIL_USER || ""}`,
        `EMAIL_PASS=${process.env.EMAIL_PASS || ""}`,
        `NOTIFICATION_EMAILS=${process.env.NOTIFICATION_EMAILS || ""}`,
        `VITE_SUPABASE_URL=${process.env.VITE_SUPABASE_URL || ""}`,
        `VITE_SUPABASE_ANON_KEY=${process.env.VITE_SUPABASE_ANON_KEY || ""}`,
        `NODE_ENV=${process.env.NODE_ENV || "production"}`
      ].join("\n");

      const envPath = path.join(process.cwd(), ".env");
      let existingEnv = "";
      try {
        if (fs.existsSync(envPath)) {
          existingEnv = fs.readFileSync(envPath, "utf-8").replace(/\r\n/g, "\n");
        }
      } catch (readErr) {}

      const normalizedNewEnv = envContent.replace(/\r\n/g, "\n");
      if (existingEnv !== normalizedNewEnv) {
        fs.writeFileSync(envPath, envContent, "utf-8");
        console.log("[Settings] Impostazioni aggiornate e salvate in .env");
      } else {
        console.log("[Settings] Nessun cambiamento rilevato nelle impostazioni, .env non sovrascritto");
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("[Settings] Errore salvataggio impostazioni:", err);
      res.status(500).json({ success: false, error: err.message || "Impossibile salvare le impostazioni." });
    }
  });

  // API per leggere le telecamere pendenti non ancora sincronizzate con Supabase
  app.get("/api/cameras/pending", (req, res) => {
    const pendingFile = path.join(process.cwd(), "pending_cameras.json");
    try {
      if (fs.existsSync(pendingFile)) {
        const dataStr = fs.readFileSync(pendingFile, "utf-8");
        const cameras = JSON.parse(dataStr);
        return res.json({ success: true, cameras });
      }
      res.json({ success: true, cameras: [] });
    } catch (err: any) {
      console.error("[Cameras Pending] Errore lettura:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API per cancellare le telecamere pendenti una volta sincronizzate
  app.post("/api/cameras/pending/clear", (req, res) => {
    const pendingFile = path.join(process.cwd(), "pending_cameras.json");
    try {
      if (fs.existsSync(pendingFile)) {
        fs.unlinkSync(pendingFile);
        console.log("[Cameras Pending] File pending_cameras.json rimosso correttamente.");
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("[Cameras Pending] Errore rimozione:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API per scansionare le reti Wi-Fi
  app.get("/api/wifi/scan", (req, res) => {
    if (process.platform === "win32") {
      // Reti fittizie per sviluppo locale su Windows
      return res.json({
        success: true,
        networks: [
          { ssid: "VigilAI_Setup_Simulata", signal: 99, security: "" },
          { ssid: "Rete_Casa_Simulata", signal: 85, security: "WPA2" },
          { ssid: "Wi-Fi_Ospiti_Simulata", signal: 60, security: "WPA2" },
          { ssid: "Ufficio_Fastweb", signal: 45, security: "WPA1 WPA2" }
        ]
      });
    }

    exec("nmcli -t -f SSID,SIGNAL,SECURITY dev wifi list", (err, stdout, stderr) => {
      if (err) {
        console.error("[WiFi Scan Error]", stderr || err.message);
        return res.status(500).json({ success: false, error: "Impossibile scansionare le reti Wi-Fi: " + (stderr || err.message) });
      }

      const lines = stdout.split("\n");
      const networks = [];
      const seenSsids = new Set();

      for (const line of lines) {
        if (!line.trim()) continue;
        const lastColonIdx = line.lastIndexOf(':');
        const secondLastColonIdx = line.lastIndexOf(':', lastColonIdx - 1);
        if (secondLastColonIdx !== -1) {
          const ssid = line.substring(0, secondLastColonIdx).replace(/\\:/g, ':').trim();
          const signal = parseInt(line.substring(secondLastColonIdx + 1, lastColonIdx), 10) || 0;
          const security = line.substring(lastColonIdx + 1).trim();
          if (ssid && !seenSsids.has(ssid)) {
            seenSsids.add(ssid);
            networks.push({ ssid, signal, security });
          }
        }
      }
      res.json({ success: true, networks });
    });
  });

  // API per connettersi a una rete Wi-Fi
  app.post("/api/wifi/connect", (req, res) => {
    const { ssid, password } = req.body;
    if (!ssid) {
      return res.status(400).json({ success: false, error: "SSID richiesto" });
    }

    if (process.platform === "win32") {
      console.log(`[WiFi] Connessione simulata a SSID: ${ssid}`);
      setTimeout(() => {
        res.json({ success: true, message: `Connesso alla rete simulata ${ssid}` });
      }, 1500);
      return;
    }

    const escapedSsid = ssid.replace(/(["`$\\])/g, '\\$1');
    const escapedPassword = password ? password.replace(/(["`$\\])/g, '\\$1') : "";
    const cmd = password 
      ? `sudo nmcli dev wifi connect "${escapedSsid}" password "${escapedPassword}"`
      : `sudo nmcli dev wifi connect "${escapedSsid}"`;

    console.log(`[WiFi] Connessione a SSID: ${ssid}...`);
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("[WiFi Connect Error] Connessione fallita, ripristino hotspot...", stderr || err.message);
        exec("sudo ./scripts/setup_ap.sh start", (apErr) => {
          if (apErr) console.error("[WiFi] Errore ripristino hotspot:", apErr);
        });
        return res.status(500).json({ 
          success: false, 
          error: "Impossibile connettersi alla Wi-Fi. Verifica password e segnale. L'hotspot di setup è stato ripristinato." 
        });
      }
      console.log(`[WiFi] Connesso con successo a SSID: ${ssid}`);
      res.json({ success: true, message: "Connesso con successo!" });
    });
  });

  // API per leggere l'hostname di sistema
  app.get("/api/system/hostname", (req, res) => {
    if (process.platform === "win32") {
      return res.json({ success: true, hostname: "VigilAI-Box" });
    }
    fs.readFile("/etc/hostname", "utf8", (err, data) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ success: true, hostname: data.trim() });
    });
  });

  // API per impostare l'hostname di sistema
  app.post("/api/system/hostname", (req, res) => {
    const { hostname } = req.body;
    if (!hostname) {
      return res.status(400).json({ success: false, error: "Hostname richiesto" });
    }

    const cleanHostname = hostname.trim().replace(/[^a-zA-Z0-9-]/g, "");
    if (!cleanHostname) {
      return res.status(400).json({ success: false, error: "Hostname non valido" });
    }

    if (process.platform === "win32") {
      console.log(`[System] Hostname simulato impostato a: ${cleanHostname}`);
      return res.json({ success: true, hostname: cleanHostname });
    }

    exec(`sudo hostnamectl set-hostname ${cleanHostname}`, (err, stdout, stderr) => {
      if (err) {
        console.error("[Hostname Error]", stderr || err.message);
        return res.status(500).json({ success: false, error: "Impossibile impostare l'hostname: " + (stderr || err.message) });
      }
      console.log(`[System] Hostname impostato a: ${cleanHostname}`);
      res.json({ success: true, hostname: cleanHostname });
    });
  });

  // API per la scansione automatica delle telecamere IP sulla sottorete locale
  app.get("/api/cameras/discover", async (req, res) => {
    console.log("[Camera Discovery] Avvio scansione sottorete locale...");
    const subnet = getLocalSubnet();
    if (!subnet) {
      if (process.platform === "win32") {
        return res.json({
          success: true,
          subnet: "192.168.1.x",
          cameras: ["192.168.1.50", "192.168.1.120"]
        });
      }
      return res.status(400).json({ success: false, error: "Nessuna interfaccia di rete attiva trovata per la scansione." });
    }

    const foundIps: string[] = [];
    const scanPromises: Promise<void>[] = [];
    
    for (let i = 1; i <= 254; i++) {
      const ip = `${subnet}.${i}`;
      scanPromises.push((async () => {
        // Scansiona prima la porta standard RTSP 554
        const has554 = await checkPort(ip, 554, 400);
        if (has554) {
          foundIps.push(ip);
          return;
        }
        // Fallback su porta RTSP alternativa 8554
        const has8554 = await checkPort(ip, 8554, 400);
        if (has8554) {
          foundIps.push(ip);
        }
      })());
    }

    try {
      await Promise.all(scanPromises);
      console.log(`[Camera Discovery] Scansione completata. Trovati IP telecamere: ${foundIps.join(", ")}`);
      res.json({ success: true, subnet: `${subnet}.x`, cameras: foundIps });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API per testare lo stream RTSP e generare un'anteprima fotogramma
  app.post("/api/cameras/test-stream", (req, res) => {
    const { rtspUrl } = req.body;
    if (!rtspUrl) {
      return res.status(400).json({ success: false, error: "RTSP URL richiesto" });
    }

    console.log(`[Camera Test] Test connessione e preview per: ${rtspUrl.split('@')[1] || rtspUrl}`);

    // Simulazione per test locali o IP simulati su Windows
    if (process.platform === "win32" || rtspUrl.includes("mock") || rtspUrl.includes("192.168.1.50") || rtspUrl.includes("192.168.1.120")) {
      const svg = `<svg width="640" height="360" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0e101a"/><circle cx="320" cy="180" r="60" fill="none" stroke="#5c62ec" stroke-width="4" stroke-dasharray="10 5"/><text x="50%" y="50%" font-family="'Outfit', sans-serif" font-size="20" fill="#f3f4f6" dominant-baseline="middle" text-anchor="middle">LIVE STREAM OK</text><text x="50%" y="60%" font-family="'Outfit', sans-serif" font-size="12" fill="#9ca3af" dominant-baseline="middle" text-anchor="middle">Rilevamento IP: ${rtspUrl.split('@')[1] || rtspUrl}</text></svg>`;
      const base64Svg = Buffer.from(svg).toString("base64");
      return res.json({
        success: true,
        preview: `data:image/svg+xml;base64,${base64Svg}`
      });
    }

    const FFMPEG_BIN = ffmpeg || "ffmpeg";
    const args = [
      "-rtsp_transport", "tcp",
      "-timeout", "5000000", // 5 secondi
      "-i", rtspUrl,
      "-vframes", "1",
      "-f", "mjpeg",
      "pipe:1"
    ];

    const ff = spawn(FFMPEG_BIN, args);
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];

    ff.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    ff.stderr.on("data", (chunk: Buffer) => {
      errChunks.push(chunk);
    });

    ff.on("close", (code) => {
      if (code === 0 && chunks.length > 0) {
        const fullBuffer = Buffer.concat(chunks);
        const base64Image = fullBuffer.toString("base64");
        res.json({
          success: true,
          preview: `data:image/jpeg;base64,${base64Image}`
        });
      } else {
        const errMsg = Buffer.concat(errChunks).toString() || "Errore sconosciuto FFmpeg";
        console.error(`[Camera Test] FFmpeg fallito: ${errMsg}`);
        res.json({
          success: false,
          error: "Impossibile aprire lo stream RTSP. Controlla URL, IP e credenziali della telecamera."
        });
      }
    });

    ff.on("error", (err) => {
      res.json({
        success: false,
        error: `Errore avvio FFmpeg: ${err.message}`
      });
    });
  });

  // Reindirizza tutte le richieste HTML al Setup Wizard se non configurato o se si accede tramite il backdoor IP
  app.use((req, res, next) => {
    const host = req.headers.host || "";
    const isBackdoor = host.includes("10.42.0.1");
    if ((!isConfigured() || isBackdoor) && !req.path.startsWith("/api/")) {
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

    const rawRecipients = recipient || process.env.NOTIFICATION_EMAILS;
    const targetRecipients = Array.isArray(rawRecipients)
      ? rawRecipients
      : typeof rawRecipients === "string"
        ? rawRecipients.split(",").map(e => e.trim()).filter(Boolean)
        : ["castromassimo@gmail.com"];

    console.log(`[Notification] Sending ${type} alert to: ${targetRecipients.join(", ")}`);

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
          to: targetRecipients,
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
    // Serve static files but disable automatic index serving (e.g. for / or /index.html)
    app.use(express.static(distPath, { index: false }));
    
    // Explicitly handle all routing paths to serve index.html with dynamically injected environment variables
    app.get("*", (req, res) => {
      try {
        const indexPath = path.join(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          let html = fs.readFileSync(indexPath, "utf-8");
          
          // Inject dynamic env script
          const envScript = `<script>
            window.__VIGILAI_ENV__ = {
              VITE_SUPABASE_URL: ${JSON.stringify(process.env.VITE_SUPABASE_URL || "")},
              VITE_SUPABASE_ANON_KEY: ${JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || "")}
            };
          </script>`;
          
          // Inject right after <head>
          html = html.replace("<head>", `<head>\n  ${envScript}`);
          res.send(html);
        } else {
          res.status(404).send("File index.html non trovato nella cartella dist. Controlla la compilazione.");
        }
      } catch (err: any) {
        res.status(500).send("Errore nel caricamento dell'applicazione: " + err.message);
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Vigil.AI Server running on http://localhost:${PORT}`);

    // Avvia la sincronizzazione delle telecamere pendenti su boot (Disattivata: gestita dal client autenticato in App.tsx)
    // syncPendingCameras();

    if (process.platform !== "win32") {
      if (!isConfigured()) {
        console.log("[Setup] Rilevata mancata configurazione. Avvio hotspot Wi-Fi temporaneo immediato...");
        exec("sudo ./scripts/setup_ap.sh start", (err, stdout, stderr) => {
          if (err) {
            console.error("[Setup] Impossibile avviare l'hotspot Wi-Fi:", stderr || err.message);
          } else {
            console.log("[Setup] Hotspot Wi-Fi avviato correttamente:", stdout.trim());
          }
        });
      } else {
        console.log("[Setup] Rilevata configurazione esistente. Attesa di 15 secondi per verificare la connessione Wi-Fi...");
        setTimeout(() => {
          if (!hasNetworkConnection()) {
            console.log("[Setup] Connessione di rete non rilevata dopo 15 secondi. Avvio hotspot Wi-Fi di emergenza...");
            exec("sudo ./scripts/setup_ap.sh start", (err, stdout, stderr) => {
              if (err) {
                console.error("[Setup] Impossibile avviare l'hotspot Wi-Fi di emergenza:", stderr || err.message);
              } else {
                console.log("[Setup] Hotspot Wi-Fi di emergenza avviato correttamente:", stdout.trim());
              }
            });
          } else {
            console.log("[Setup] Connessione di rete attiva rilevata. Hotspot non avviato.");
          }
        }, 15000);
      }
    }
  });
}

startServer();
