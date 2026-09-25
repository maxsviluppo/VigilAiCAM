import net from 'net';

const cams = ['192.168.1.34', '192.168.1.38'];
const ports = [21, 22, 23, 80, 443, 554, 1024, 1054, 1935, 2020, 8000, 8080, 8200, 8554, 8899, 9000, 3702, 37777, 65534];

function checkPort(ip, port, timeout = 300) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(timeout);
    s.once('connect', () => { s.destroy(); resolve(port); });
    s.once('timeout', () => { s.destroy(); resolve(null); });
    s.once('error', () => { s.destroy(); resolve(null); });
    s.connect(port, ip);
  });
}

async function main() {
  for (const ip of cams) {
    const results = await Promise.all(ports.map(p => checkPort(ip, p)));
    const open = results.filter(Boolean);
    console.log(`Camera ${ip} -> Open Ports: [${open.join(', ')}]`);
  }
}

main();
