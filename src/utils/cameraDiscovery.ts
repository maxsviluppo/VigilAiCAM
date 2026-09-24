import dgram from 'dgram';
import fs from 'fs';
import { exec } from 'child_process';
import net from 'net';
import { networkInterfaces } from 'os';

export interface DiscoveredCamera {
  ip: string;
  port: number;
  mac?: string;
  hostname?: string;
  brand?: string;
  xaddrs?: string;
  rtspUrl?: string;
  method: 'ws-discovery' | 'dhcp-lease' | 'arp' | 'port-scan';
}

const WS_DISCOVERY_PROBE = `<?xml version="1.0" encoding="UTF-8"?>
<e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope"
            xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing"
            xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"
            xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
  <e:Header>
    <w:MessageID>uuid:${generateUuid()}</w:MessageID>
    <w:To e:mustUnderstand="true">urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>
    <w:Action a:mustUnderstand="true" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action>
  </e:Header>
  <e:Body>
    <d:Probe>
      <d:Types>dn:NetworkVideoTransmitter</d:Types>
    </d:Probe>
  </e:Body>
</e:Envelope>`;

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function guessBrandFromMac(mac?: string): string {
  if (!mac) return 'Telecamera IP / ONVIF';
  const clean = mac.replace(/[:-]/g, '').toUpperCase().slice(0, 6);
  if (['54AF97', '3460F9', '6032B1', 'AC84C6', 'CC32E5', 'B0A7B9', 'E4C32A', '98254A', '704F57', 'F46BEF', '50D4F7', '40313C'].includes(clean)) {
    return 'TP-Link Tapo';
  }
  if (['C42F90', '1868CB', 'E05349', '4419B6', 'BC8A08', 'D46E0E', '2857BE'].includes(clean)) {
    return 'Hikvision / EZVIZ';
  }
  if (['3C8CF8', 'E0508B', 'B8A386', 'A0BDCD', '4CE173'].includes(clean)) {
    return 'Dahua / IMOU';
  }
  if (['EC71DB', '9CE32B', '001A8C'].includes(clean)) {
    return 'Reolink';
  }
  return 'Telecamera IP / ONVIF';
}

/**
 * 1. ONVIF WS-Discovery Probe via UDP multicast su 239.255.255.250:3702
 */
export function probeWsDiscovery(timeoutMs = 2500): Promise<DiscoveredCamera[]> {
  return new Promise((resolve) => {
    const devices: Map<string, DiscoveredCamera> = new Map();
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    let isClosed = false;
    const cleanup = () => {
      if (!isClosed) {
        isClosed = true;
        try {
          socket.close();
        } catch {
          // ignore
        }
        resolve(Array.from(devices.values()));
      }
    };

    socket.on('error', (err) => {
      console.warn('[WS-Discovery] Errore socket:', err.message);
      cleanup();
    });

    socket.on('message', (msg, rinfo) => {
      try {
        const text = msg.toString('utf-8');
        if (text.includes('ProbeMatches') || text.includes('NetworkVideoTransmitter') || text.includes('onvif')) {
          const xaddrMatch = text.match(/<(?:\w+:)?XAddrs>([^<]+)<\/(?:\w+:)?XAddrs>/i);
          const xaddrs = xaddrMatch ? xaddrMatch[1].trim() : undefined;
          
          let port = 554;
          if (xaddrs) {
            const urlMatch = xaddrs.match(/https?:\/\/[^/:]+:(\d+)/i);
            if (urlMatch) {
              const onvifPort = parseInt(urlMatch[1], 10);
              port = onvifPort === 2020 ? 554 : onvifPort;
            }
          }

          if (!devices.has(rinfo.address)) {
            devices.set(rinfo.address, {
              ip: rinfo.address,
              port: 554,
              brand: xaddrs?.includes(':2020') ? 'TP-Link Tapo' : 'Dispositivo ONVIF',
              xaddrs,
              method: 'ws-discovery'
            });
          }
        }
      } catch (err: any) {
        console.warn('[WS-Discovery] Errore decodifica risposta:', err.message);
      }
    });

    socket.bind(0, () => {
      try {
        socket.setBroadcast(true);
        socket.setMulticastTTL(2);
        
        const message = Buffer.from(WS_DISCOVERY_PROBE, 'utf-8');
        socket.send(message, 0, message.length, 3702, '239.255.255.250', (err) => {
          if (err) {
            console.warn('[WS-Discovery] Errore invio pacchetto:', err.message);
          }
        });
      } catch (err: any) {
        console.warn('[WS-Discovery] Errore configurazione socket:', err.message);
      }
    });

    setTimeout(cleanup, timeoutMs);
  });
}

/**
 * 2. Lettura Leases DHCP rilasciati da dnsmasq su Raspberry Pi (porta eth0 o hotspot)
 */
/**
 * 2. Lettura Leases DHCP rilasciati da dnsmasq su Raspberry Pi (porta eth0 o hotspot)
 * Verifica effettiva che la porta RTSP (554) o ONVIF (2020) sia aperta.
 */
export async function getDhcpLeases(): Promise<DiscoveredCamera[]> {
  const leasePaths = [
    '/var/lib/misc/dnsmasq.leases',
    '/var/lib/NetworkManager/dnsmasq-eth0.leases',
    '/var/lib/NetworkManager/dnsmasq-enp0s3.leases',
    '/var/lib/NetworkManager/dnsmasq.leases',
    '/tmp/dnsmasq.leases'
  ];

  const candidateDevices: Array<{ ip: string; mac: string; hostname?: string }> = [];

  for (const p of leasePaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf-8');
        for (const line of content.split('\n')) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 4) {
            const mac = parts[1];
            const ip = parts[2];
            const hostname = parts[3] !== '*' ? parts[3] : undefined;
            if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
              candidateDevices.push({ ip, mac, hostname });
            }
          }
        }
      } catch (err: any) {
        console.warn(`[DHCP Leases] Errore lettura ${p}:`, err.message);
      }
    }
  }

  const verified: DiscoveredCamera[] = [];
  for (const c of candidateDevices) {
    const has554 = await checkPort(c.ip, 554, 300);
    const has2020 = !has554 ? await checkPort(c.ip, 2020, 300) : false;
    if (has554 || has2020) {
      verified.push({
        ip: c.ip,
        port: 554,
        mac: c.mac,
        hostname: c.hostname,
        brand: has2020 ? 'TP-Link Tapo (ONVIF)' : guessBrandFromMac(c.mac),
        method: 'dhcp-lease'
      });
    }
  }

  return verified;
}

/**
 * 3. Lettura Tabella ARP del sistema
 * FILTRA tassativamente i dispositivi: include SOLO quelli con porta 554 o 2020 aperta
 * per evitare di considerare come telecamere smartphone, router, PC o stampanti!
 */
export async function getArpCameras(excludeIps: Set<string> = new Set()): Promise<DiscoveredCamera[]> {
  const candidateIps: Array<{ ip: string; mac: string; hostname?: string }> = [];
  
  if (fs.existsSync('/proc/net/arp')) {
    try {
      const content = fs.readFileSync('/proc/net/arp', 'utf-8');
      const lines = content.split('\n').slice(1);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          const ip = parts[0];
          const flags = parts[2];
          const mac = parts[3];
          const iface = parts[5];
          if (flags !== '0x0' && mac !== '00:00:00:00:00:00' && !excludeIps.has(ip)) {
            candidateIps.push({
              ip,
              mac,
              hostname: iface ? `Interfaccia ${iface}` : undefined
            });
          }
        }
      }
    } catch {
      // fallback a comando arp -a
    }
  }

  if (candidateIps.length === 0) {
    await new Promise<void>((resolve) => {
      exec('arp -a', (err, stdout) => {
        if (!err && stdout) {
          for (const line of stdout.split('\n')) {
            const match = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+([0-9a-fA-F-]{17})/);
            if (match) {
              const ip = match[1];
              const mac = match[2].replace(/-/g, ':');
              if (
                !ip.endsWith('.255') &&
                !ip.startsWith('224.') &&
                !ip.startsWith('239.') &&
                !ip.startsWith('127.') &&
                !excludeIps.has(ip)
              ) {
                candidateIps.push({ ip, mac });
              }
            }
          }
        }
        resolve();
      });
    });
  }

  // Verifica TCP reale: un host in tabella ARP è una telecamera SOLO se risponde su RTSP o ONVIF
  const confirmed: DiscoveredCamera[] = [];
  await Promise.all(
    candidateIps.map(async (c) => {
      const is554 = await checkPort(c.ip, 554, 350);
      if (is554) {
        confirmed.push({
          ip: c.ip,
          port: 554,
          mac: c.mac,
          hostname: c.hostname,
          brand: guessBrandFromMac(c.mac),
          method: 'arp'
        });
        return;
      }
      const is2020 = await checkPort(c.ip, 2020, 350);
      if (is2020) {
        confirmed.push({
          ip: c.ip,
          port: 554,
          mac: c.mac,
          hostname: c.hostname,
          brand: 'TP-Link Tapo (ONVIF)',
          method: 'arp'
        });
      }
    })
  );

  return confirmed;
}

function checkPort(ip: string, port: number, timeout = 350): Promise<boolean> {
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

/**
 * Ottiene tutti gli IP locali della macchina host per escluderli dai risultati
 */
export function getLocalHostIps(): Set<string> {
  const nets = networkInterfaces();
  const hostIps = new Set<string>();

  for (const name of Object.keys(nets)) {
    const ifaces = nets[name];
    if (ifaces) {
      for (const info of ifaces) {
        if (info.family === 'IPv4') {
          hostIps.add(info.address);
        }
      }
    }
  }

  return hostIps;
}

/**
 * Funzione unificata di Discovery Reale:
 * 1. ONVIF WS-Discovery Probe (UDP Multicast 239.255.255.250:3702) - Certo al 100%
 * 2. DHCP Leases Raspberry con test porta RTSP/ONVIF
 * 3. Tabella ARP filtrata SOLO con test porta RTSP/ONVIF attiva
 * Restituisce ESCLUSIVAMENTE telecamere autentiche rilevate, senza duplicati o falsi positivi.
 */
export async function discoverAllCameras(): Promise<DiscoveredCamera[]> {
  const combinedMap = new Map<string, DiscoveredCamera>();
  const hostIps = getLocalHostIps();

  // A. Esegui WS-Discovery (multicast UDP ONVIF)
  try {
    const wsDevices = await probeWsDiscovery(2500);
    for (const d of wsDevices) {
      if (!hostIps.has(d.ip)) {
        combinedMap.set(d.ip, d);
      }
    }
  } catch (err: any) {
    console.warn('[Discovery] Errore WS-Discovery:', err.message);
  }

  // B. Rileva da DHCP Leases (dnsmasq su Raspberry Pi) con verifica porta RTSP/ONVIF
  try {
    const dhcpDevices = await getDhcpLeases();
    for (const d of dhcpDevices) {
      if (!hostIps.has(d.ip)) {
        if (!combinedMap.has(d.ip)) {
          combinedMap.set(d.ip, d);
        } else {
          const existing = combinedMap.get(d.ip)!;
          existing.mac = existing.mac || d.mac;
          existing.hostname = existing.hostname || d.hostname;
          if (d.brand && existing.brand === 'Dispositivo ONVIF') existing.brand = d.brand;
        }
      }
    }
  } catch (err: any) {
    console.warn('[Discovery] Errore Leases DHCP:', err.message);
  }

  // C. Rileva da Tabella ARP con verifica porta RTSP/ONVIF (escludendo IP già trovati e IP host)
  try {
    const alreadyFoundIps = new Set<string>([...hostIps, ...combinedMap.keys()]);
    const arpDevices = await getArpCameras(alreadyFoundIps);
    for (const d of arpDevices) {
      if (!combinedMap.has(d.ip) && !hostIps.has(d.ip)) {
        combinedMap.set(d.ip, d);
      }
    }
  } catch (err: any) {
    console.warn('[Discovery] Errore Tabella ARP:', err.message);
  }

  // Costruisci l'URL RTSP di default per ogni telecamera reale trovata
  const results = Array.from(combinedMap.values()).map(cam => {
    return {
      ...cam,
      rtspUrl: `rtsp://${cam.ip}:${cam.port || 554}/stream1`
    };
  });

  return results;
}
