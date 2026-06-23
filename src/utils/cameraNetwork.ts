import type { Camera } from '../types';

const LOCAL_CAMERA_SETTINGS_KEY = 'vigilai_camera_local_settings';

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

export function parseEnabledTriggers(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter(Boolean).map(String);
  if (typeof val === 'string' && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {
      return val.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

export function loadLocalCameraSettings(cameraId: string): { enabledTriggers?: string[] } {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_CAMERA_SETTINGS_KEY) || '{}');
    return all[cameraId] || {};
  } catch {
    return {};
  }
}

export function persistLocalCameraSettings(
  cameraId: string,
  settings: { enabledTriggers?: string[] }
) {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_CAMERA_SETTINGS_KEY) || '{}');
    all[cameraId] = { ...all[cameraId], ...settings };
    localStorage.setItem(LOCAL_CAMERA_SETTINGS_KEY, JSON.stringify(all));
  } catch {
    /* ignore storage errors */
  }
}

export function getCameraOrderNumber(
  cameras: { id: string }[],
  cameraId?: string | null
): number | null {
  if (!cameraId) return null;
  const idx = cameras.findIndex(c => c.id === cameraId);
  return idx >= 0 ? idx + 1 : null;
}

export function isCompleteCameraIp(ip: string | undefined | null): boolean {
  if (!ip) return false;
  const trimmed = ip.trim();
  if (!trimmed || trimmed.endsWith('.')) return false;
  return IPV4_RE.test(trimmed);
}

export function parseIpFromRtspUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const atMatch = url.match(/@([\d.]+)(?::\d+)?/);
  if (atMatch && isCompleteCameraIp(atMatch[1])) return atMatch[1];
  try {
    const normalized = url.replace(/^rtsp:/i, 'http:');
    const hostname = new URL(normalized).hostname;
    if (isCompleteCameraIp(hostname)) return hostname;
  } catch {
    /* ignore malformed url */
  }
  return null;
}

export function isPartialIpEntry(ip: string | undefined | null): boolean {
  const trimmed = (ip || '').trim();
  if (!trimmed) return false;
  if (isCompleteCameraIp(trimmed)) return false;
  if (/^\d{1,3}$/.test(trimmed)) return true;
  return /^[\d.]+$/.test(trimmed);
}

export function normalizeEnteredIp(
  ip: string | undefined | null,
  subnetHint?: string | null
): string {
  const trimmed = (ip || '').trim();
  if (!trimmed) return '';
  if (isCompleteCameraIp(trimmed)) return trimmed;

  if (trimmed.includes('@') || trimmed.startsWith('rtsp')) {
    const parsed = parseIpFromRtspUrl(trimmed.startsWith('rtsp') ? trimmed : `rtsp://x@${trimmed}`);
    if (parsed) return parsed;
  }

  const embedded = trimmed.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
  if (embedded && isCompleteCameraIp(embedded[1])) return embedded[1];

  const hostOnly = trimmed.match(/^([\d.]+):\d+/);
  if (hostOnly && isCompleteCameraIp(hostOnly[1])) return hostOnly[1];

  if (/^\d{1,3}$/.test(trimmed)) {
    const octet = Number(trimmed);
    if (octet >= 0 && octet <= 255) {
      if (subnetHint) {
        const parts = subnetHint.split('.');
        if (parts.length === 4) {
          const candidate = `${parts[0]}.${parts[1]}.${parts[2]}.${octet}`;
          if (isCompleteCameraIp(candidate)) return candidate;
        }
      }
      const fallback = `192.168.1.${octet}`;
      if (isCompleteCameraIp(fallback)) return fallback;
    }
  }

  return trimmed;
}

export function resolveCameraIp(cam: {
  ip?: string;
  url?: string;
}): string {
  const direct = normalizeEnteredIp(cam.ip);
  if (isCompleteCameraIp(direct)) return direct;
  return parseIpFromRtspUrl(cam.url) || (cam.ip || '').trim();
}

export function buildOnvifRtspUrl(cam: {
  ip: string;
  port?: number;
  username?: string;
  password?: string;
  rtspPath?: string;
}): string {
  const user = cam.username || '';
  const pass = cam.password || '';
  const port = cam.port || 554;
  const path = cam.rtspPath || '/stream1';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `rtsp://${user}:${pass}@${cam.ip}:${port}${normalizedPath}`;
}

export function getDefaultCameraIpPrefix(subnetHint?: string | null): string {
  if (subnetHint) {
    const parts = subnetHint.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.`;
  }
  return '192.168.1.';
}

export function getIpLastOctet(ip: string | undefined | null): string {
  const trimmed = (ip || '').trim();
  if (!trimmed) return '';
  if (isCompleteCameraIp(trimmed)) return trimmed.split('.').pop() || '';
  if (/^\d{1,3}$/.test(trimmed)) return trimmed;
  if (trimmed.endsWith('.')) return '';
  const last = trimmed.split('.').pop() || '';
  return /^\d{1,3}$/.test(last) ? last : '';
}

export function buildIpFromPrefixAndOctet(prefix: string, octet: string): string {
  const cleanPrefix = prefix.endsWith('.') ? prefix : `${prefix}.`;
  const cleanOctet = octet.replace(/\D/g, '').slice(0, 3);
  if (!cleanOctet) return cleanPrefix;
  return `${cleanPrefix}${cleanOctet}`;
}

/** Evita di usare l'IP del Raspberry come IP camera (es. Pi .10 → camera deve essere .8) */
export function sanitizeCameraIpForEdit(
  ip: string | undefined | null,
  subnetHint?: string | null
): string {
  const trimmed = (ip || '').trim();
  const prefix = getDefaultCameraIpPrefix(subnetHint);
  if (!trimmed) return prefix;
  if (subnetHint && isCompleteCameraIp(trimmed) && trimmed === subnetHint.trim()) {
    return prefix;
  }
  if (isCompleteCameraIp(trimmed)) return trimmed;
  if (isPartialIpEntry(trimmed)) return trimmed;
  return prefix;
}

function isIncompleteIpValue(val: unknown): boolean {
  if (val === undefined || val === null) return true;
  const s = String(val).trim();
  if (!s) return true;
  if (s.endsWith('.') && !isCompleteCameraIp(s)) return true;
  return false;
}

export function mergeCameraForSave<T extends {
  ip?: string;
  url?: string;
  username?: string;
  password?: string;
  port?: number;
  rtspPath?: string;
}>(persisted: T | undefined, edited: T): T {
  if (!persisted) return { ...edited };

  const merged = { ...persisted, ...edited };
  const preserve = (key: keyof T) => {
    const editedVal = edited[key];
    const persistedVal = persisted[key];
    if (key === 'ip' && isCompleteCameraIp(String(editedVal ?? ''))) {
      return;
    }
    const editedEmpty =
      key === 'ip'
        ? isIncompleteIpValue(editedVal)
        : editedVal === undefined ||
          editedVal === null ||
          (typeof editedVal === 'string' && editedVal.trim() === '');
    const persistedOk =
      persistedVal !== undefined &&
      persistedVal !== null &&
      !(typeof persistedVal === 'string' && persistedVal.trim() === '');
    if (editedEmpty && persistedOk) {
      merged[key] = persistedVal;
    }
  };

  preserve('ip');
  preserve('url');
  preserve('username');
  preserve('password');
  preserve('port');
  preserve('rtspPath');
  return merged;
}

export function prepareCameraNetworkFields(
  cam: {
    ip?: string;
    url?: string;
    type?: string;
    port?: number;
    username?: string;
    password?: string;
    rtspPath?: string;
  },
  subnetHint?: string | null
): { ip: string; url: string } {
  const rawIp = (cam.ip || '').trim();
  const normalizedInput = normalizeEnteredIp(cam.ip, subnetHint);

  let ip: string;
  if (isCompleteCameraIp(normalizedInput)) {
    ip = normalizedInput;
  } else if (isPartialIpEntry(rawIp)) {
    // IP in digitazione: non sovrascrivere con quello estratto dall'URL salvato
    ip = rawIp;
  } else {
    ip = resolveCameraIp({ ip: normalizedInput, url: cam.url });
  }

  let url = (cam.url || '').trim();

  if (cam.type === 'onvif' && isCompleteCameraIp(ip)) {
    url = buildOnvifRtspUrl({
      ip,
      port: cam.port,
      username: cam.username,
      password: cam.password,
      rtspPath: cam.rtspPath,
    });
  } else if (cam.type === 'ip' && isCompleteCameraIp(ip)) {
    url = url || buildOnvifRtspUrl({
      ip,
      port: cam.port,
      username: cam.username,
      password: cam.password,
      rtspPath: '/stream1',
    });
  } else if (!isCompleteCameraIp(ip) && !isPartialIpEntry(rawIp) && url) {
    const parsed = parseIpFromRtspUrl(url);
    if (parsed) ip = parsed;
  }

  return { ip, url };
}

export function requiresStreamUrl(type?: string): boolean {
  return type === 'onvif' || type === 'ip';
}

export function hasValidStreamConfig(
  cam: {
    ip?: string;
    url?: string;
    type?: string;
    port?: number;
    username?: string;
    password?: string;
    rtspPath?: string;
  },
  subnetHint?: string | null
): boolean {
  const { ip, url } = prepareCameraNetworkFields(cam, subnetHint);
  return isCompleteCameraIp(ip) || !!parseIpFromRtspUrl(url);
}

export function finalizeCameraForSave(
  edited: Camera,
  persisted: Camera | undefined,
  subnetHint?: string | null
): Camera {
  const merged = mergeCameraForSave(persisted, edited);
  let { ip, url } = prepareCameraNetworkFields(
    {
      ip: merged.ip,
      url: merged.url,
      type: merged.type,
      port: merged.port,
      username: merged.username,
      password: merged.password,
      rtspPath: merged.rtspPath,
    },
    subnetHint
  );

  if (persisted && !hasValidStreamConfig({ ...merged, ip, url }, subnetHint)) {
    const fromPersisted = prepareCameraNetworkFields(
      {
        ip: persisted.ip,
        url: persisted.url,
        type: persisted.type,
        port: persisted.port,
        username: persisted.username,
        password: persisted.password,
        rtspPath: persisted.rtspPath,
      },
      subnetHint
    );
    const persistedIsPiIp =
      !!subnetHint &&
      isCompleteCameraIp(fromPersisted.ip) &&
      fromPersisted.ip.trim() === subnetHint.trim();
    if (hasValidStreamConfig(fromPersisted, subnetHint) && !persistedIsPiIp) {
      ip = fromPersisted.ip;
      url = fromPersisted.url;
    }
  }

  if (subnetHint && isCompleteCameraIp(ip) && ip.trim() === subnetHint.trim()) {
    ip = sanitizeCameraIpForEdit(ip, subnetHint);
    url = '';
  }

  return {
    ...merged,
    ip,
    url: url || merged.url || '',
    enabledTriggers: Array.isArray(edited.enabledTriggers)
      ? [...edited.enabledTriggers]
      : Array.isArray(merged.enabledTriggers)
        ? [...merged.enabledTriggers]
        : [],
    rtspPath: edited.rtspPath ?? merged.rtspPath ?? '/stream1',
  };
}

export function mapDbCamera(c: Record<string, unknown>, subnetHint?: string | null): Camera {
  const rtspPath = (c.rtsp_path as string) || '/stream1';
  const { ip, url } = prepareCameraNetworkFields(
    {
      ip: c.ip as string | undefined,
      url: c.url as string | undefined,
      type: c.type as string | undefined,
      port: c.port as number | undefined,
      username: c.username as string | undefined,
      password: c.password as string | undefined,
      rtspPath,
    },
    subnetHint
  );

  const safeIp = sanitizeCameraIpForEdit(ip, subnetHint);
  const piIp = subnetHint?.trim();
  const safeUrl =
    safeIp !== ip && piIp && parseIpFromRtspUrl(url) === piIp ? '' : url;

  let enabledTriggers = parseEnabledTriggers(c.enabled_triggers);
  if (enabledTriggers.length === 0 && c.id) {
    const local = loadLocalCameraSettings(String(c.id));
    if (local.enabledTriggers?.length) {
      enabledTriggers = [...local.enabledTriggers];
    }
  }

  return {
    id: String(c.id),
    name: (c.name as string) || 'Camera',
    location: (c.location as string) || '',
    type: (c.type as Camera['type']) || 'onvif',
    url: safeUrl,
    ip: safeIp,
    port: (c.port as number) || 554,
    username: (c.username as string) || '',
    password: (c.password as string) || '',
    rtspPath,
    zones: (c.zones as Camera['zones']) || [],
    status: (c.status as Camera['status']) || 'online',
    enabledTriggers,
  };
}

export function toDbCameraRecord(
  cam: Camera,
  userId: string,
  order?: number
): Record<string, unknown> {
  let ip = (cam.ip || '').trim();
  let url = (cam.url || '').trim();

  if (!isCompleteCameraIp(ip) && url) {
    const parsed = parseIpFromRtspUrl(url);
    if (parsed) ip = parsed;
  }
  if (url && !parseIpFromRtspUrl(url)) {
    url = '';
  }
  if (!isCompleteCameraIp(ip)) {
    ip = parseIpFromRtspUrl(url) || '';
  }

  const record: Record<string, unknown> = {
    user_id: userId,
    name: cam.name || 'Camera',
    location: cam.location || '',
    type: cam.type || 'onvif',
    url,
    ip: isCompleteCameraIp(ip) ? ip : '',
    port: cam.port ?? 554,
    username: cam.username || '',
    password: cam.password || '',
    rtsp_path: cam.rtspPath || '/stream1',
    enabled_triggers: Array.isArray(cam.enabledTriggers) ? [...cam.enabledTriggers] : [],
    zones: cam.zones || [],
    status: cam.status || 'online',
  };

  if (cam.id && !String(cam.id).startsWith('cam-')) {
    record.id = cam.id;
  }
  if (order !== undefined) {
    record.order = order;
  }

  return record;
}
