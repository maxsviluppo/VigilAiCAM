import fs from "fs";
import path from "path";
import { spawn } from "child_process";

export interface UpdateManifest {
  version: string;
  url: string;
  sha256?: string;
  changelog?: string;
  critical?: boolean;
  minVersion?: string;
}

export type UpdateState =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "installing"
  | "success"
  | "error"
  | "rollback";

export interface UpdateStatus {
  state: UpdateState;
  currentVersion: string;
  availableVersion?: string;
  progress?: number;
  message?: string;
  changelog?: string;
  lastCheck?: string;
  error?: string;
}

const STATUS_FILE = path.join(process.cwd(), ".update-status.json");
const UPDATE_SCRIPT = path.join(process.cwd(), "scripts", "update_vigilai.sh");

function readPackageVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"));
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function parseVersionParts(version: string): number[] {
  const core = version.split("-")[0];
  return core.split(".").map((part) => parseInt(part, 10) || 0);
}

export function compareVersions(a: string, b: string): number {
  const pa = parseVersionParts(a);
  const pb = parseVersionParts(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export function getCurrentVersion(): string {
  return readPackageVersion();
}

export function readUpdateStatus(): UpdateStatus {
  const currentVersion = getCurrentVersion();
  try {
    if (fs.existsSync(STATUS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(STATUS_FILE, "utf-8")) as Partial<UpdateStatus>;
      return { state: "idle", ...parsed, currentVersion };
    }
  } catch (err) {
    console.warn("[Update] Impossibile leggere stato update:", err);
  }
  return { state: "idle", currentVersion };
}

export function writeUpdateStatus(partial: Partial<UpdateStatus>): UpdateStatus {
  const prev = readUpdateStatus();
  const next: UpdateStatus = {
    ...prev,
    ...partial,
    currentVersion: getCurrentVersion(),
  };
  fs.writeFileSync(STATUS_FILE, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

export async function fetchManifest(): Promise<UpdateManifest> {
  const url = process.env.UPDATE_MANIFEST_URL?.trim();
  if (!url) {
    throw new Error("UPDATE_MANIFEST_URL non configurato nel file .env");
  }

  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) {
    throw new Error(`Manifest non raggiungibile (HTTP ${res.status})`);
  }

  const manifest = (await res.json()) as UpdateManifest;
  if (!manifest.version || !manifest.url) {
    throw new Error("Manifest non valido: servono version e url");
  }
  return manifest;
}

export async function checkForUpdate(): Promise<{
  updateAvailable: boolean;
  currentVersion: string;
  manifest?: UpdateManifest;
  status: UpdateStatus;
}> {
  writeUpdateStatus({ state: "checking", message: "Controllo aggiornamenti...", error: undefined });

  try {
    const manifest = await fetchManifest();
    const currentVersion = getCurrentVersion();
    const updateAvailable = compareVersions(manifest.version, currentVersion) > 0;

    if (updateAvailable) {
      const status = writeUpdateStatus({
        state: "available",
        availableVersion: manifest.version,
        changelog: manifest.changelog,
        message: `Aggiornamento v${manifest.version} disponibile`,
        lastCheck: new Date().toISOString(),
        error: undefined,
      });
      return { updateAvailable: true, currentVersion, manifest, status };
    }

    const status = writeUpdateStatus({
      state: "idle",
      availableVersion: undefined,
      changelog: undefined,
      message: "Software aggiornato",
      lastCheck: new Date().toISOString(),
      error: undefined,
    });
    return { updateAvailable: false, currentVersion, status };
  } catch (err: any) {
    const status = writeUpdateStatus({
      state: "error",
      error: err.message || "Errore controllo aggiornamenti",
      lastCheck: new Date().toISOString(),
    });
    throw Object.assign(err, { status });
  }
}

let updateRunning = false;

export function startUpdateApply(manifest: UpdateManifest): { started: boolean; error?: string } {
  if (updateRunning) {
    return { started: false, error: "Aggiornamento già in corso" };
  }

  if (process.platform === "win32") {
    writeUpdateStatus({ state: "error", error: "OTA disponibile solo su Raspberry Pi Linux" });
    return { started: false, error: "OTA disponibile solo su Raspberry Pi Linux" };
  }

  if (!fs.existsSync(UPDATE_SCRIPT)) {
    writeUpdateStatus({ state: "error", error: "Script update_vigilai.sh non trovato" });
    return { started: false, error: "Script update_vigilai.sh non trovato" };
  }

  updateRunning = true;
  writeUpdateStatus({
    state: "downloading",
    progress: 5,
    availableVersion: manifest.version,
    changelog: manifest.changelog,
    message: "Download pacchetto aggiornamento...",
    error: undefined,
  });

  const child = spawn(
    "bash",
    [UPDATE_SCRIPT, manifest.url, manifest.version, manifest.sha256 || ""],
    {
      detached: true,
      stdio: "ignore",
      cwd: process.cwd(),
      env: { ...process.env, VIGILAI_APP_DIR: process.cwd() },
    }
  );

  child.on("error", (err) => {
    updateRunning = false;
    writeUpdateStatus({ state: "error", error: err.message });
  });

  child.on("exit", (code) => {
    updateRunning = false;
    if (code && code !== 0) {
      const current = readUpdateStatus();
      if (current.state !== "success" && current.state !== "rollback") {
        writeUpdateStatus({
          state: "error",
          error: current.error || `Aggiornamento terminato con codice ${code}`,
        });
      }
    }
  });

  child.unref();
  return { started: true };
}

function bumpPatchVersion(version: string): string {
  const core = version.split("-")[0];
  const parts = parseVersionParts(core);
  parts[2] = (parts[2] ?? 0) + 1;
  return parts.join(".");
}

export function getSimulatedUpdateManifest(): UpdateManifest {
  const currentVersion = getCurrentVersion();
  const nextVersion = bumpPatchVersion(currentVersion.replace(/-dev$/i, ""));
  return {
    version: nextVersion,
    url: "https://simulated.local/vigilai-update.tar.gz",
    changelog:
      "Simulazione OTA — nessun file verrà modificato.\n• Fix setup camera per numero\n• Trigger salvati correttamente\n• UI 3.5\" ottimizzata",
    critical: false,
  };
}

export function prepareSimulatedUpdateCheck(): {
  updateAvailable: boolean;
  currentVersion: string;
  manifest: UpdateManifest;
  status: UpdateStatus;
} {
  const manifest = getSimulatedUpdateManifest();
  const currentVersion = getCurrentVersion();
  const status = writeUpdateStatus({
    state: "available",
    availableVersion: manifest.version,
    changelog: manifest.changelog,
    message: `Simulazione: aggiornamento v${manifest.version} disponibile`,
    lastCheck: new Date().toISOString(),
    error: undefined,
  });
  return { updateAvailable: true, currentVersion, manifest, status };
}

let simulateRunning = false;

export function startSimulatedUpdateApply(): { started: boolean; error?: string } {
  if (simulateRunning || updateRunning) {
    return { started: false, error: "Aggiornamento già in corso" };
  }

  const manifest = getSimulatedUpdateManifest();
  simulateRunning = true;

  const steps: Array<{ delay: number; partial: Partial<UpdateStatus> }> = [
    {
      delay: 0,
      partial: {
        state: "downloading",
        progress: 8,
        availableVersion: manifest.version,
        changelog: manifest.changelog,
        message: "Download pacchetto simulato...",
        error: undefined,
      },
    },
    {
      delay: 1800,
      partial: {
        state: "downloading",
        progress: 32,
        message: "Verifica checksum simulata...",
      },
    },
    {
      delay: 3600,
      partial: {
        state: "installing",
        progress: 58,
        message: "Installazione componenti simulata...",
      },
    },
    {
      delay: 5400,
      partial: {
        state: "installing",
        progress: 82,
        message: "Configurazione servizi simulata...",
      },
    },
    {
      delay: 7200,
      partial: {
        state: "success",
        progress: 100,
        message: "Simulazione completata — nessun riavvio, nessun file modificato.",
      },
    },
  ];

  for (const step of steps) {
    setTimeout(() => {
      writeUpdateStatus(step.partial);
      if (step.partial.state === "success") {
        simulateRunning = false;
        setTimeout(() => {
          writeUpdateStatus({
            state: "idle",
            progress: undefined,
            message: "Software aggiornato (simulazione terminata)",
            availableVersion: undefined,
            changelog: undefined,
          });
        }, 8000);
      }
    }, step.delay);
  }

  return { started: true };
}
