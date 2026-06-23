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
import os from "os";
import dns from "dns";
import { WebSocket } from "ws";
import { isValidGeminiApiKey, normalizeGeminiApiKey } from "./src/utils/geminiApiKey.ts";
import {
  checkForUpdate,
  getCurrentVersion,
  prepareSimulatedUpdateCheck,
  readUpdateStatus,
  startSimulatedUpdateApply,
  startUpdateApply,
  getSimulatedUpdateManifest,
} from "./updateManager.ts";

// Polyfill WebSocket per ambienti Node.js < 22 (richiesto da Supabase Realtime)
(global as any).WebSocket = WebSocket;

// FIX DEFINITIVO PER ENETUNREACH SU RASPBERRY PI (Node.js 18+ IPv6 issue)
dns.setDefaultResultOrder("ipv4first");

dotenv.config();

// ─── TELEGRAM via Direct API (Senza OpenClaw) ─────────────────────────────────
// Invia una notifica Telegram usando direttamente le API di Telegram.
async function sendTelegramNotification(description: string, screenshotBase64?: string, targetChatId?: string, targetBotToken?: string): Promise<void> {
  const chatId = targetChatId || process.env.TELEGRAM_CHAT_ID;
  const botToken = targetBotToken || process.env.TELEGRAM_BOT_TOKEN;
  
  if (!chatId || !botToken) {
    console.log("[Telegram] TELEGRAM_CHAT_ID o TELEGRAM_BOT_TOKEN non impostato, skip.");
    return;
  }

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
        throw new Error(`Telegram API returned ${response.status}: ${text}`);
      }
      console.log(`[Telegram] Foto inviata con successo alla chat ${chatId}`);
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
        throw new Error(`Telegram API returned ${response.status}: ${text}`);
      }
      console.log(`[Telegram] Messaggio inviato con successo alla chat ${chatId}`);
    }
  } catch (err: any) {
    console.error(`[Telegram] Errore invio: ${err.message}`);
  }
}
// ─────────────────────────────────────────────────────────────────────────────

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

  // CORS middleware to support API requests from any host (e.g. Vercel deployment)
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Credenziali SMTP di default pre-configurate per l'invio delle notifiche (facilmente modificabili qui)
  const DEFAULT_SMTP_USER = "allarme.vigilai@gmail.com";
  const DEFAULT_SMTP_PASS = "xyuptamrfbdvbalp";

  // Controlla se le chiavi Supabase nel file .env sono state configurate
  const isConfigured = () => {
    return !!(
      process.env.VITE_SUPABASE_URL &&
      process.env.VITE_SUPABASE_ANON_KEY
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

  const ENV_PATH = path.join(process.cwd(), ".env");

  const normalizeEnvText = (content: string) => content.replace(/\r\n/g, "\n").trimEnd();

  const buildEnvContent = () => {
    let nodeEnv = process.env.NODE_ENV || "production";
    try {
      if (fs.existsSync(ENV_PATH)) {
        const match = fs.readFileSync(ENV_PATH, "utf-8").match(/^NODE_ENV=(.*)$/m);
        if (match?.[1]?.trim()) nodeEnv = match[1].trim();
      }
    } catch { /* ignore */ }

    return [
      `GEMINI_API_KEY=${process.env.GEMINI_API_KEY || ""}`,
      `VITE_GEMINI_API_KEY=${process.env.VITE_GEMINI_API_KEY || ""}`,
      `EMAIL_USER=${process.env.EMAIL_USER || ""}`,
      `EMAIL_PASS=${process.env.EMAIL_PASS || ""}`,
      `TELEGRAM_CHAT_ID=${process.env.TELEGRAM_CHAT_ID || ""}`,
      `TELEGRAM_BOT_TOKEN=${process.env.TELEGRAM_BOT_TOKEN || ""}`,
      `NOTIFICATION_EMAILS=${process.env.NOTIFICATION_EMAILS || ""}`,
      `VITE_SUPABASE_URL=${process.env.VITE_SUPABASE_URL || ""}`,
      `VITE_SUPABASE_ANON_KEY=${process.env.VITE_SUPABASE_ANON_KEY || ""}`,
      `NODE_ENV=${nodeEnv}`,
    ].join("\n");
  };

  const writeEnvIfChanged = () => {
    const envContent = buildEnvContent();
    const normalizedNewEnv = normalizeEnvText(envContent);
    let existingEnv = "";
    try {
      if (fs.existsSync(ENV_PATH)) {
        existingEnv = normalizeEnvText(fs.readFileSync(ENV_PATH, "utf-8"));
      }
    } catch { /* ignore */ }

    if (existingEnv !== normalizedNewEnv) {
      fs.writeFileSync(ENV_PATH, `${envContent}\n`, "utf-8");
      console.log("[Settings] Impostazioni aggiornate e salvate in .env");
      return true;
    }

    console.log("[Settings] Nessun cambiamento rilevato nelle impostazioni, .env non sovrascritto");
    return false;
  };

  const syncSettingsFromCloud = async () => {
    console.log("[Sync Cloud] Controllo impostazioni globali da Supabase...");
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.log("[Sync Cloud] Credenziali Supabase mancanti. Sincronizzazione saltata.");
      return;
    }

    if (!hasNetworkConnection()) {
      console.log("[Sync Cloud] Rete non disponibile. Riprovo tra 10 secondi...");
      setTimeout(syncSettingsFromCloud, 10000);
      return;
    }

    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      let changed = false;

      // Sincronizza global_settings (SMTP, Telegram, Notifiche)
      const { data, error } = await supabase
        .from('global_settings')
        .select('smtp_user, smtp_pass, telegram_chat_id, telegram_bot_token, notification_emails')
        .eq('id', 'master')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("[Sync Cloud] Errore lettura global_settings:", error.message);
        throw new Error(`Errore global_settings: ${error.message}`);
      }

      if (data) {
        if (data.smtp_user && data.smtp_user !== process.env.EMAIL_USER) {
          process.env.EMAIL_USER = data.smtp_user;
          changed = true;
        }
        if (data.smtp_pass && data.smtp_pass !== process.env.EMAIL_PASS) {
          process.env.EMAIL_PASS = data.smtp_pass;
          changed = true;
        }
        if (data.telegram_chat_id && data.telegram_chat_id !== process.env.TELEGRAM_CHAT_ID) {
          process.env.TELEGRAM_CHAT_ID = data.telegram_chat_id;
          changed = true;
        }
        if (data.telegram_bot_token && data.telegram_bot_token !== process.env.TELEGRAM_BOT_TOKEN) {
          process.env.TELEGRAM_BOT_TOKEN = data.telegram_bot_token;
          changed = true;
        }
        if (data.notification_emails && data.notification_emails !== process.env.NOTIFICATION_EMAILS) {
          process.env.NOTIFICATION_EMAILS = data.notification_emails;
          changed = true;
        }
      }

      // Sincronizza API Key Gemini (tabella settings)
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('gemini_part1, gemini_part2')
        .eq('id', 'gemini_key_backup')
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error("[Sync Cloud] Errore lettura settings (Gemini):", settingsError.message);
        throw new Error(`Errore letture settings: ${settingsError.message}`);
      }

      if (settingsData && settingsData.gemini_part1 && settingsData.gemini_part2) {
        const fullKey = settingsData.gemini_part1 + settingsData.gemini_part2;
        if (fullKey && fullKey !== process.env.GEMINI_API_KEY) {
          process.env.GEMINI_API_KEY = fullKey;
          process.env.VITE_GEMINI_API_KEY = fullKey;
          changed = true;
        }
      }

      if (changed) {
        console.log("[Sync Cloud] Rilevate nuove configurazioni dal Cloud. Aggiornamento file .env locale in corso...");
        writeEnvIfChanged();
        console.log("[Sync Cloud] Sincronizzazione completata con successo. Credenziali aggiornate.");
      } else {
        console.log("[Sync Cloud] Le impostazioni locali sono già sincronizzate con il Cloud.");
      }

    } catch (err: any) {
      console.error("[Sync Cloud] Eccezione durante la sincronizzazione:", err.message);
      throw err;
    }
  };

  // Esegui il sync cloud solo se siamo su Raspberry Pi (o comunque non su Windows/Mac in sviluppo)
  const isRaspberry = process.platform !== "win32" && process.platform !== "darwin";

  if (isRaspberry) {
    syncSettingsFromCloud();
    
    // Sincronizzazione automatica ogni 5 minuti (300000 ms)
    setInterval(() => {
      console.log("[Auto-Sync] Avvio sincronizzazione cloud periodica (5 minuti)...");
      syncSettingsFromCloud();
    }, 5 * 60 * 1000);
  } else {
    console.log("[Auto-Sync] Sync automatico disattivato su PC locale. Attivo solo su Raspberry Pi.");
  }

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
      
      const supabaseUrl = VITE_SUPABASE_URL || "https://bdcryhunzdemuficudws.supabase.co";
      const supabaseAnonKey = VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkY3J5aHVuemRlbXVmaWN1ZHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxODQ4MzcsImV4cCI6MjA5Mzc2MDgzN30.hlqDNRSqgV12o3lFDFnB7wL5ve04JIk8T_VyjydLGh0";

      // Usa sempre le credenziali SMTP di default se il cliente non ne ha inserite di personalizzate
      const finalEmailUser = EMAIL_USER || DEFAULT_SMTP_USER;
      const finalEmailPass = EMAIL_PASS || DEFAULT_SMTP_PASS;

      const envContent = [
        `GEMINI_API_KEY=${GEMINI_API_KEY || ""}`,
        `VITE_GEMINI_API_KEY=${VITE_GEMINI_API_KEY || ""}`,
        `EMAIL_USER=${finalEmailUser}`,
        `EMAIL_PASS=${finalEmailPass}`,
        `NOTIFICATION_EMAILS=${NOTIFICATION_EMAILS || ""}`,
        `VITE_SUPABASE_URL=${supabaseUrl}`,
        `VITE_SUPABASE_ANON_KEY=${supabaseAnonKey}`,
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

  const checkInternetConnectivity = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (process.platform === "win32") {
        resolve(hasNetworkConnection());
        return;
      }
      exec("ping -c 1 -W 3 8.8.8.8", (err) => {
        resolve(!err);
      });
    });
  };

  const getCurrentWifiSsid = (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (process.platform === "win32") {
        resolve(hasNetworkConnection() ? "Rete_Casa_Simulata" : null);
        return;
      }
      exec("nmcli -t -f ACTIVE,SSID dev wifi", (err, stdout) => {
        if (err || !stdout) {
          resolve(null);
          return;
        }
        for (const line of stdout.split("\n")) {
          if (!line.trim()) continue;
          const parts = line.split(":");
          if (parts[0] === "yes" && parts[1]) {
            resolve(parts.slice(1).join(":").replace(/\\:/g, ":").trim() || null);
            return;
          }
        }
        resolve(null);
      });
    });
  };

  // API per verificare lo stato della connessione di rete all'avvio e in runtime
  app.get("/api/network/status", async (req, res) => {
    try {
      if (process.platform === "win32" && req.query.simulateOffline === "1") {
        return res.json({
          success: true,
          hasLocalNetwork: false,
          hasInternet: false,
          online: false,
          currentSsid: null,
          simulated: true
        });
      }

      const hasLocalNetwork = hasNetworkConnection();
      const hasInternet = hasLocalNetwork ? await checkInternetConnectivity() : false;
      const currentSsid = await getCurrentWifiSsid();

      res.json({
        success: true,
        hasLocalNetwork,
        hasInternet,
        online: hasLocalNetwork && hasInternet,
        currentSsid
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        hasLocalNetwork: false,
        hasInternet: false,
        online: false,
        currentSsid: null,
        error: err.message || "Errore verifica rete"
      });
    }
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

  // API per leggere le impostazioni correnti (Gemini Key, SMTP, Telegram e Email Destinatari)
  app.get("/api/settings", (req, res) => {
    try {
      res.json({
        success: true,
        geminiKey: process.env.GEMINI_API_KEY || "",
        emailUser: process.env.EMAIL_USER || "",
        emailPass: process.env.EMAIL_PASS || "",
        telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
        telegramToken: process.env.TELEGRAM_BOT_TOKEN || "",
        notificationEmails: process.env.NOTIFICATION_EMAILS 
          ? process.env.NOTIFICATION_EMAILS.split(",").map(e => e.trim()).filter(Boolean)
          : ["allarme.vigilai@gmail.com"],
        supabaseUrl: process.env.VITE_SUPABASE_URL || "",
        supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || ""
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API per salvare le impostazioni dal pannello di controllo dell'app
  app.post("/api/settings", async (req, res) => {
    try {
      const {
        geminiKey,
        emailUser,
        emailPass,
        telegramChatId,
        telegramToken,
        notificationEmails,
        supabaseUrl,
        supabaseAnonKey,
        skipCloudSync,
      } = req.body;

      if (geminiKey !== undefined && geminiKey.trim() !== "") {
        const normalizedKey = normalizeGeminiApiKey(geminiKey);
        process.env.GEMINI_API_KEY = normalizedKey;
        process.env.VITE_GEMINI_API_KEY = normalizedKey;
      }
      if (emailUser !== undefined && emailUser.trim() !== "") process.env.EMAIL_USER = emailUser;
      if (emailPass !== undefined && emailPass.trim() !== "") process.env.EMAIL_PASS = emailPass;
      if (telegramChatId !== undefined) process.env.TELEGRAM_CHAT_ID = telegramChatId;
      if (telegramToken !== undefined) process.env.TELEGRAM_BOT_TOKEN = telegramToken;
      if (notificationEmails !== undefined) {
        process.env.NOTIFICATION_EMAILS = Array.isArray(notificationEmails)
          ? notificationEmails.join(",")
          : notificationEmails;
      }
      if (supabaseUrl !== undefined && supabaseUrl.trim() !== "") process.env.VITE_SUPABASE_URL = supabaseUrl;
      if (supabaseAnonKey !== undefined && supabaseAnonKey.trim() !== "") process.env.VITE_SUPABASE_ANON_KEY = supabaseAnonKey;

      const envChanged = writeEnvIfChanged();

      const currentSupabaseUrl = process.env.VITE_SUPABASE_URL;
      const currentSupabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
      if (!skipCloudSync && currentSupabaseUrl && currentSupabaseKey) {
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const supabase = createClient(currentSupabaseUrl, currentSupabaseKey);

          const nextGlobal = {
            smtp_user: process.env.EMAIL_USER || "",
            smtp_pass: process.env.EMAIL_PASS || "",
            telegram_chat_id: process.env.TELEGRAM_CHAT_ID || "",
            telegram_bot_token: process.env.TELEGRAM_BOT_TOKEN || "",
            notification_emails: process.env.NOTIFICATION_EMAILS || "",
          };

          const { data: existingGlobal } = await supabase
            .from("global_settings")
            .select("smtp_user, smtp_pass, telegram_chat_id, telegram_bot_token, notification_emails")
            .eq("id", "master")
            .maybeSingle();

          const globalChanged =
            envChanged ||
            !existingGlobal ||
            existingGlobal.smtp_user !== nextGlobal.smtp_user ||
            existingGlobal.smtp_pass !== nextGlobal.smtp_pass ||
            existingGlobal.telegram_chat_id !== nextGlobal.telegram_chat_id ||
            existingGlobal.telegram_bot_token !== nextGlobal.telegram_bot_token ||
            existingGlobal.notification_emails !== nextGlobal.notification_emails;

          if (globalChanged) {
            const { error } = await supabase.from("global_settings").upsert({
              id: "master",
              ...nextGlobal,
              updated_at: new Date().toISOString(),
            });

            if (error) {
              console.error("[Settings] Errore sincronizzazione globale su Supabase:", error.message);
            } else {
              console.log("[Settings] Credenziali sincronizzate globalmente su Supabase (global_settings)");
            }
          }

          if (process.env.GEMINI_API_KEY && isValidGeminiApiKey(process.env.GEMINI_API_KEY)) {
            const keyLen = process.env.GEMINI_API_KEY.length;
            const half = Math.floor(keyLen / 2);
            const part1 = process.env.GEMINI_API_KEY.substring(0, half);
            const part2 = process.env.GEMINI_API_KEY.substring(half);
            const { data: existingGemini } = await supabase
              .from("settings")
              .select("gemini_part1, gemini_part2")
              .eq("id", "gemini_key_backup")
              .maybeSingle();

            if (
              envChanged ||
              !existingGemini ||
              existingGemini.gemini_part1 !== part1 ||
              existingGemini.gemini_part2 !== part2
            ) {
              await supabase.from("settings").upsert({
                id: "gemini_key_backup",
                gemini_part1: part1,
                gemini_part2: part2,
                updated_at: new Date().toISOString(),
              });
              console.log("[Settings] API Key Gemini di backup sincronizzata su Supabase (settings)");
            }
          }
        } catch (supabaseErr: any) {
          console.error("[Settings] Eccezione durante la sincronizzazione Supabase:", supabaseErr.message);
        }
      } else if (skipCloudSync) {
        console.log("[Settings] Sync cloud saltato (applicazione da remoto/realtime).");
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("[Settings] Errore salvataggio impostazioni:", err);
      res.status(500).json({ success: false, error: err.message || "Impossibile salvare le impostazioni." });
    }
  });

  // API per forzare la sincronizzazione dal cloud
  app.post("/api/sync/force", async (req, res) => {
    console.log("[API] Richiesta sincronizzazione forzata dal cloud...");
    try {
      await syncSettingsFromCloud();
      res.json({ success: true, message: "Sincronizzazione cloud completata." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API per leggere lo stato della VPN Tailscale ed il link di associazione
  app.get("/api/vpn/status", (req, res) => {
    if (process.platform === "win32") {
      return res.json({
        success: true,
        installed: true,
        state: "NeedsLogin",
        authUrl: "https://login.tailscale.com/a/mock-login-url",
        ip: null
      });
    }

    const checkStatus = (retryOnNeedLogin = true) => {
      exec("tailscale status --json", (err, stdout) => {
        if (err) {
          return res.json({
            success: true,
            installed: false,
            state: "NotInstalled",
            authUrl: null,
            ip: null
          });
        }

        try {
          const status = JSON.parse(stdout);
          const state = status.BackendState || "Unknown";
          const authUrl = status.AuthURL || null;
          const selfIp = status.Self && status.Self.TailscaleIPs ? status.Self.TailscaleIPs[0] : null;

          if (state === "NeedsLogin" && !authUrl && retryOnNeedLogin) {
            console.log("[VPN] Stato NeedsLogin senza AuthURL, lancio tailscale up...");
            exec("sudo tailscale up", () => {
              setTimeout(() => checkStatus(false), 1500);
            });
            return;
          }

          res.json({
            success: true,
            installed: true,
            state,
            authUrl,
            ip: selfIp
          });
        } catch (parseErr) {
          res.json({
            success: true,
            installed: true,
            state: "Error",
            authUrl: null,
            ip: null
          });
        }
      });
    };

    checkStatus();
  });

  // API per attivare manualmente Tailscale
  app.post("/api/vpn/activate", (req, res) => {
    if (process.platform === "win32") {
      return res.json({ success: true, state: "NeedsLogin", authUrl: "https://login.tailscale.com/a/mock-login-url" });
    }

    console.log("[VPN] Attivazione manuale Tailscale richiesta...");
    exec("sudo tailscale up", () => {
      setTimeout(() => {
        exec("tailscale status --json", (err, stdout) => {
          if (err) return res.status(500).json({ success: false, error: "Impossibile attivare Tailscale." });
          try {
            const status = JSON.parse(stdout);
            res.json({
              success: true,
              installed: true,
              state: status.BackendState || "Unknown",
              authUrl: status.AuthURL || null,
              ip: status.Self && status.Self.TailscaleIPs ? status.Self.TailscaleIPs[0] : null
            });
          } catch (e: any) {
            res.status(500).json({ success: false, error: e.message });
          }
        });
      }, 1500);
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

  // API per il riavvio del box Raspberry Pi o simulazione su Windows
  app.post("/api/system/reboot", (req, res) => {
    console.log("[System] Comando riavvio ricevuto...");
    res.json({ success: true, message: "Sistema in riavvio..." });
    setTimeout(() => {
      if (process.platform !== "win32") {
        exec("sudo reboot", (err) => {
          if (err) console.error("[System] Errore riavvio:", err);
        });
      } else {
        console.log("[System] Riavvio simulato (Windows). Termino il processo.");
        process.exit(0);
      }
    }, 1000);
  });

  // ─── OTA Update API ───────────────────────────────────────────────────────
  app.get("/api/update/status", (_req, res) => {
    res.json({ success: true, ...readUpdateStatus() });
  });

  app.get("/api/update/check", async (_req, res) => {
    try {
      const result = await checkForUpdate();
      res.json({
        success: true,
        updateAvailable: result.updateAvailable,
        currentVersion: result.currentVersion,
        availableVersion: result.manifest?.version,
        changelog: result.manifest?.changelog,
        critical: result.manifest?.critical ?? false,
        status: result.status,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || "Errore controllo aggiornamenti",
        ...readUpdateStatus(),
      });
    }
  });

  app.post("/api/update/apply", async (req, res) => {
    try {
      const result = await checkForUpdate();
      if (!result.updateAvailable || !result.manifest) {
        return res.status(400).json({
          success: false,
          error: "Nessun aggiornamento disponibile",
          currentVersion: result.currentVersion,
        });
      }

      const started = startUpdateApply(result.manifest);
      if (!started.started) {
        return res.status(409).json({ success: false, error: started.error });
      }

      res.json({
        success: true,
        message: `Aggiornamento v${result.manifest.version} avviato`,
        availableVersion: result.manifest.version,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Impossibile avviare aggiornamento" });
    }
  });

  app.post("/api/update/simulate/check", (_req, res) => {
    try {
      const result = prepareSimulatedUpdateCheck();
      res.json({
        success: true,
        simulated: true,
        updateAvailable: result.updateAvailable,
        currentVersion: result.currentVersion,
        availableVersion: result.manifest.version,
        changelog: result.manifest.changelog,
        critical: result.manifest.critical ?? false,
        status: result.status,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || "Errore simulazione aggiornamento",
        ...readUpdateStatus(),
      });
    }
  });

  app.post("/api/update/simulate/apply", (_req, res) => {
    try {
      const started = startSimulatedUpdateApply();
      if (!started.started) {
        return res.status(409).json({ success: false, error: started.error });
      }

      const manifest = getSimulatedUpdateManifest();
      res.json({
        success: true,
        simulated: true,
        message: `Simulazione aggiornamento v${manifest.version} avviata`,
        availableVersion: manifest.version,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Impossibile avviare simulazione" });
    }
  });

  // API di diagnostica di rete per risolvere errori ENETUNREACH
  app.get("/api/system/diagnostic", (req, res) => {
    if (process.platform === "win32") {
      return res.json({
        success: true,
        pingIp: "OK",
        pingDns: "OK",
        route: "default via 192.168.1.1 dev wlan0 proto dhcp src 192.168.1.15 metric 600",
        dns: "nameserver 8.8.8.8\nnameserver 1.1.1.1"
      });
    }

    exec("ping -c 1 -W 2 8.8.8.8", (errIp, stdoutIp, stderrIp) => {
      exec("ping -c 1 -W 2 smtp.gmail.com", (errDns, stdoutDns, stderrDns) => {
        exec("ip route", (errRoute, stdoutRoute) => {
          fs.readFile("/etc/resolv.conf", "utf8", (errRes, resolvConf) => {
            res.json({
              success: true,
              pingIp: errIp ? `FALLITO (nessuna connessione IP esterna): ${stderrIp || errIp.message}` : "OK",
              pingDns: errDns ? `FALLITO (nessuna risoluzione DNS o SMTP irraggiungibile): ${stderrDns || errDns.message}` : "OK",
              route: stdoutRoute || "Nessuna rotta trovata",
              dns: resolvConf || "Nessun DNS configurato"
            });
          });
        });
      });
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
          return;
        }
        // Fallback su porta ONVIF 2020 (TP-Link Tapo C220)
        const has2020 = await checkPort(ip, 2020, 400);
        if (has2020) {
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

    const FFMPEG_BIN = process.platform === "win32" ? (ffmpeg || "ffmpeg.exe") : "ffmpeg";
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

    ff.on("error", (err: any) => {
      console.error(`[FFmpeg Error in /api/cameras/test-stream] Impossibile avviare ffmpeg:`, err.message);
      if (err.code === 'ENOENT') {
        console.error(`CRITICAL: ffmpeg non è installato o non è nel PATH del Raspberry Pi! Installa con: sudo apt install ffmpeg`);
      }
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
    const configured = isConfigured();

    if (!configured && !req.path.startsWith("/api/")) {
      console.log(`[Setup Diagnostic] Redirect di ${req.method} ${req.path} al Setup Wizard. host=${host}, isBackdoor=${isBackdoor}`);
      console.log(`  - GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? "Presente" : "Mancante"}`);
      console.log(`  - VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? "Presente" : "Mancante"}`);
      console.log(`  - VITE_SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY ? "Presente" : "Mancante"}`);
      console.log(`  - EMAIL_USER: ${process.env.EMAIL_USER ? "Presente" : "Mancante"}`);
      console.log(`  - EMAIL_PASS: ${process.env.EMAIL_PASS ? "Presente" : "Mancante"}`);
    }

    if ((!configured || isBackdoor) && !req.path.startsWith("/api/")) {
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

  app.post("/api/notify", async (req, res) => {
    const { screenshot, description, type, recipient, emailUser, emailPass, telegramChatId, telegramToken } = req.body;

    console.log(`[Notification] Sending ${type} alert to: ${Array.isArray(recipient) ? recipient.join(", ") : recipient}`);

    try {
      if (type === "email") {
        let user = emailUser || process.env.EMAIL_USER || DEFAULT_SMTP_USER;
        let pass = emailPass || process.env.EMAIL_PASS || DEFAULT_SMTP_PASS;

        // Tenta di recuperare le credenziali globali da Supabase
        const currentSupabaseUrl = process.env.VITE_SUPABASE_URL;
        const currentSupabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
        if (currentSupabaseUrl && currentSupabaseKey) {
          try {
            const { createClient } = await import("@supabase/supabase-js");
            const supabase = createClient(currentSupabaseUrl, currentSupabaseKey);
            const { data, error } = await supabase.from('global_settings').select('smtp_user, smtp_pass').eq('id', 'master').single();
            if (data && data.smtp_user && data.smtp_pass) {
              user = data.smtp_user;
              pass = data.smtp_pass;
              console.log("[Notification] Utilizzate credenziali SMTP globali da Supabase.");
            }
          } catch (supErr: any) {
            console.error("[Notification] Errore lettura Supabase SMTP:", supErr.message);
          }
        }

        if (!user || !pass) {
          console.error("CRITICAL: EMAIL_USER or EMAIL_PASS missing!");
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

        console.log(`[Notification] SMTP Transporter initialization: host=${host}, port=${port}, secure=${secure}, user=${user}`);

        let resolvedHost = host;
        try {
          // Risoluzione DNS forzata in IPv4 per evitare i problemi di routing IPv6 del Raspberry
          const address = await new Promise<string>((resolve, reject) => {
            dns.lookup(host, { family: 4 }, (err, addr) => {
              if (err) reject(err);
              else resolve(addr);
            });
          });
          resolvedHost = address;
          console.log(`[Notification] Resolved SMTP host ${host} to IPv4: ${resolvedHost}`);
        } catch (dnsErr) {
          console.warn(`[Notification] Failed to resolve IPv4 for ${host}. Using hostname directly.`);
        }

        const transporter = nodemailer.createTransport({
          host: resolvedHost,
          port,
          secure,
          auth: { user, pass },
          tls: {
            rejectUnauthorized: false,
            servername: host // Obbligatorio per i certificati TLS se passiamo un IP
          }
        });

        const mailOptions = {
          from: `"Vigil.AI - Sistema di Sicurezza" <${user}>`,
          to: recipient,
          subject: "🚨 ALLERTA SICUREZZA - Rilevamento Emergenza",
          text: `ATTENZIONE: Il sistema Vigil.AI ha rilevato una possibile emergency.\n\nDettagli: ${description}\n\nData/Ora: ${new Date().toLocaleString('it-IT')}`,
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

      // ── Telegram (sempre, in parallelo all'email) ──────────────────────────
      // Non blocca la risposta e non fallisce anche se Telegram non è configurato
      sendTelegramNotification(description, screenshot, telegramChatId, telegramToken).catch((tgErr) => {
        console.error("[Telegram] Errore non gestito:", tgErr);
      });

      // ───────────────────────────────────────────────────────────────────────

      res.json({ success: true });
    } catch (error: any) {
      console.error("Notification error:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to send notification" });
    }
  });

  // --- IP CAMERA STREAM MANAGER ---
  const { spawn } = await import("child_process");
  const FFMPEG_BIN = process.platform === "win32" ? (ffmpeg || "ffmpeg.exe") : "ffmpeg";
  const activeStreams = new Map<string, { latestFrame: Buffer | null, lastAccessed: number, startTime: number, process: any }>();
  
  const SOI = Buffer.from([0xFF, 0xD8]);
  const EOI = Buffer.from([0xFF, 0xD9]);

  async function startStream(rtspUrl: string) {
    const existing = activeStreams.get(rtspUrl);
    if (existing?.process && !existing.process.killed) {
      existing.lastAccessed = Date.now();
      return;
    }

    console.log(`[Camera Manager] Starting FFmpeg for: ${rtspUrl.split('@')[1] || rtspUrl}`);
    const args = [
      '-loglevel', 'error',
      '-rtsp_transport', 'tcp',
      '-timeout', '10000000',
      '-i', rtspUrl,
      '-an',
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
    
    ff.stderr.on('data', (data) => {
      const msg = data.toString();
      fs.appendFile(logPath, `[${new Date().toISOString()}] [${rtspUrl.split('@')[1]}] ${msg}`, (err) => {
        if (err) console.error(`[Camera Manager] Error writing to ffmpeg_error.log: ${err.message}`);
      });
      if (msg.includes('error') || msg.includes('failed') || msg.includes('Invalid')) {
        console.error(`[FFmpeg Error] ${msg.trim()}`);
      }
    });

    ff.on('error', (err: any) => {
      console.error(`[FFmpeg Spawn Error] Impossibile avviare il processo per la camera:`, err.message);
      if (err.code === 'ENOENT') {
        console.error(`CRITICAL: ffmpeg non è installato o non è nel PATH del Raspberry Pi! Installa con: sudo apt install ffmpeg`);
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
      fs.appendFile(logPath, `[${new Date().toISOString()}] [ERROR] ${err.message}\n`, (writeErr) => {
        if (writeErr) console.error(`[Camera Manager] Error writing to ffmpeg_error.log: ${writeErr.message}`);
      });
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

  app.get("/api/mjpeg", async (req, res) => {
    const rtsp = req.query.rtsp as string;
    if (!rtsp) return res.status(400).end("Missing rtsp parameter");

    if (!activeStreams.has(rtsp)) {
      console.log(`[API] MJPEG init for ${rtsp.split("@")[1] || rtsp}`);
      startStream(rtsp);
    }

    const deadline = Date.now() + 25000;
    while (Date.now() < deadline) {
      if (req.socket.destroyed) return;
      const stream = activeStreams.get(rtsp);
      if (stream?.latestFrame && stream.latestFrame.length > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    const initial = activeStreams.get(rtsp);
    if (!initial?.latestFrame?.length) {
      return res.status(504).end("Stream timeout — camera non raggiungibile");
    }

    res.writeHead(200, {
      "Content-Type": "multipart/x-mixed-replace; boundary=frame",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Connection: "keep-alive",
    });

    let closed = false;
    const pushFrame = () => {
      if (closed) return;
      const stream = activeStreams.get(rtsp);
      if (!stream) {
        startStream(rtsp);
        return;
      }
      stream.lastAccessed = Date.now();
      const frame = stream.latestFrame;
      if (!frame || frame.length === 0) return;
      try {
        res.write(
          `--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`
        );
        res.write(frame);
        res.write("\r\n");
      } catch {
        closed = true;
      }
    };

    pushFrame();
    const interval = setInterval(pushFrame, 400);

    req.on("close", () => {
      closed = true;
      clearInterval(interval);
    });
  });

  // Route to simulate and test the setup wizard locally
  app.get("/setup", (req, res) => {
    res.sendFile(path.join(process.cwd(), "setup_simulator.html"));
  });

  app.get("/setup-wizard", (req, res) => {
    res.sendFile(path.join(process.cwd(), "setup_wizard.html"));
  });

  app.get("/simulator", (req, res) => {
    res.sendFile(path.join(process.cwd(), "app_simulator.html"));
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
    // Serve static files but disable automatic index serving
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
    console.log(`[Update] Versione installata: v${getCurrentVersion()}`);
    console.log("[Setup Diagnostic] Stato configurazione all'avvio:");
    console.log(`  - GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? "Presente" : "Mancante"}`);
    console.log(`  - VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? "Presente" : "Mancante"}`);
    console.log(`  - VITE_SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY ? "Presente" : "Mancante"}`);
    console.log(`  - EMAIL_USER: ${process.env.EMAIL_USER ? "Presente" : "Mancante"}`);
    console.log(`  - EMAIL_PASS: ${process.env.EMAIL_PASS ? "Presente" : "Mancante"}`);
    console.log(`  - Configurato completamente (isConfigured): ${isConfigured() ? "SI" : "NO"}`);

    // Avvia la sincronizzazione delle telecamere pendenti su boot
    syncPendingCameras();

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
