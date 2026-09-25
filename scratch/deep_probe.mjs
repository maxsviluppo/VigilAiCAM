import net from 'net';
import http from 'http';

const targets = [
  '192.168.1.34',
  '192.168.1.35',
  '192.168.1.36',
  '192.168.1.38',
  '192.168.1.40',
  '192.168.1.41',
  '192.168.1.42',
  '192.168.1.54',
  '192.168.1.55'
];

const ports = [21, 22, 23, 80, 443, 554, 1935, 2020, 3000, 3702, 5000, 8000, 8080, 8554, 8899, 9988, 37777];

function checkPort(ip, port, timeout = 400) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(timeout);
    s.once('connect', () => {
      s.destroy();
      resolve(true);
    });
    s.once('timeout', () => {
      s.destroy();
      resolve(false);
    });
    s.once('error', () => {
      s.destroy();
      resolve(false);
    });
    s.connect(port, ip);
  });
}

function grabHttpTitleOrBanner(ip, port) {
  return new Promise((resolve) => {
    const req = http.request({ host: ip, port: port, path: '/', method: 'GET', timeout: 800 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk.toString('utf-8'));
      res.on('end', () => {
        const titleMatch = data.match(/<title>([^<]+)<\/title>/i);
        const server = res.headers['server'] || '';
        resolve({ title: titleMatch ? titleMatch[1].trim() : '', server, status: res.statusCode });
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

async function probeRtspOptions(ip, port = 554) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(1000);
    let banner = '';
    s.once('connect', () => {
      s.write(`OPTIONS rtsp://${ip}:${port}/ RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: VigilAI-Probe\r\n\r\n`);
    });
    s.on('data', (d) => {
      banner += d.toString('utf-8');
      s.destroy();
      resolve(banner.split('\r\n')[0]);
    });
    s.on('timeout', () => { s.destroy(); resolve(null); });
    s.on('error', () => { s.destroy(); resolve(null); });
  });
}

async function main() {
  console.log('--- DETAILED TARGET PROBE ---');
  for (const ip of targets) {
    const open = [];
    for (const p of ports) {
      if (await checkPort(ip, p)) open.push(p);
    }
    if (open.length > 0) {
      console.log(`\nDevice ${ip} -> Open Ports: [${open.join(', ')}]`);
      if (open.includes(80)) {
        const httpInfo = await grabHttpTitleOrBanner(ip, 80);
        if (httpInfo) console.log(`  HTTP:80 -> Status: ${httpInfo.status}, Server: "${httpInfo.server}", Title: "${httpInfo.title}"`);
      }
      if (open.includes(8080)) {
        const httpInfo = await grabHttpTitleOrBanner(ip, 8080);
        if (httpInfo) console.log(`  HTTP:8080 -> Status: ${httpInfo.status}, Server: "${httpInfo.server}", Title: "${httpInfo.title}"`);
      }
      if (open.includes(554)) {
        const rtspBanner = await probeRtspOptions(ip, 554);
        console.log(`  RTSP:554 -> Response: "${rtspBanner || 'Connect OK (No OPTIONS banner)'}"`);
      }
    }
  }
}

main().catch(console.error);
