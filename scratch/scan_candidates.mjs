import net from 'net';
import http from 'http';
import https from 'https';

const arpDevices = [
  { ip: '192.168.1.34', mac: '34:c6:dd:ea:33:8f' },
  { ip: '192.168.1.35', mac: '38:ef:e3:94:6d:f6' },
  { ip: '192.168.1.36', mac: 'd8:cb:8a:e9:85:25' },
  { ip: '192.168.1.38', mac: '20:bb:bc:3f:26:11' },
  { ip: '192.168.1.40', mac: '00:24:54:bb:9d:83' },
  { ip: '192.168.1.41', mac: '38:ca:84:01-a8:59' },
  { ip: '192.168.1.42', mac: 'c8:40:52:8b:c3:cd' },
  { ip: '192.168.1.49', mac: '4e:20:e2:ca:62:d2' },
  { ip: '192.168.1.54', mac: '88:a2:9e:b4:02:58' },
  { ip: '192.168.1.55', mac: 'f2:c0:c2:17:64:f3' }
];

const testPorts = [21, 22, 80, 443, 554, 1935, 2020, 8000, 8080, 8899, 37777];

function checkPort(ip, port, timeout = 300) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(timeout);
    s.once('connect', () => { s.destroy(); resolve(true); });
    s.once('timeout', () => { s.destroy(); resolve(false); });
    s.once('error', () => { s.destroy(); resolve(false); });
    s.connect(port, ip);
  });
}

function fetchMacVendor(mac) {
  return new Promise((resolve) => {
    https.get(`https://api.maclookup.app/v2/macs/${mac}`, { timeout: 2000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.company || 'Unknown');
        } catch {
          resolve('Unknown');
        }
      });
    }).on('error', () => resolve('Unknown'));
  });
}

function probeRtsp(ip, port) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(1200);
    s.once('connect', () => {
      s.write(`DESCRIBE rtsp://${ip}:${port}/live/ch0 RTSP/1.0\r\nCSeq: 1\r\nAccept: application/sdp\r\n\r\n`);
    });
    s.on('data', (d) => {
      s.destroy();
      resolve(d.toString('utf-8').split('\r\n').slice(0, 3).join(' | '));
    });
    s.on('timeout', () => { s.destroy(); resolve(null); });
    s.on('error', () => { s.destroy(); resolve(null); });
  });
}

async function main() {
  console.log('--- PARALLEL SCAN OF CANDIDATES ---');
  await Promise.all(arpDevices.map(async (dev) => {
    const portChecks = await Promise.all(testPorts.map(async (p) => {
      const open = await checkPort(dev.ip, p);
      return open ? p : null;
    }));
    const openPorts = portChecks.filter(Boolean);
    const vendor = await fetchMacVendor(dev.mac);

    let extraInfo = '';
    if (openPorts.includes(554)) {
      const rtspInfo = await probeRtsp(dev.ip, 554);
      extraInfo += `\n    -> RTSP 554 Banner: ${rtspInfo || 'Responded (no banner)'}`;
    }
    if (openPorts.includes(2020)) {
      extraInfo += '\n    -> Port 2020 OPEN (Tapo ONVIF Service)';
    }
    if (openPorts.includes(8000)) {
      extraInfo += '\n    -> Port 8000 OPEN (Hikvision / DVR Service)';
    }

    console.log(`[${dev.ip}] MAC: ${dev.mac} | Vendor: ${vendor} | Open Ports: [${openPorts.join(', ')}]${extraInfo}`);
  }));
}

main().catch(console.error);
