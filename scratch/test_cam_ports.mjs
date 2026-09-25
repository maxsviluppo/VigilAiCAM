import net from 'net';

const cams = ['192.168.1.34', '192.168.1.38', '192.168.1.40'];

function checkPort(ip, port, timeout = 1000) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(timeout);
    s.once('connect', () => { s.destroy(); resolve(true); });
    s.once('timeout', () => { s.destroy(); resolve(false); });
    s.once('error', () => { s.destroy(); resolve(false); });
    s.connect(port, ip);
  });
}

async function main() {
  console.log('Testing ports on candidate cameras...');
  const ports = [21, 22, 23, 80, 443, 554, 1024, 1054, 1935, 2020, 8000, 8080, 8200, 8554, 8899, 9000, 3702, 37777, 65534];
  
  for (const cam of cams) {
    console.log(`\nTesting ${cam}:`);
    for (const p of ports) {
      const open = await checkPort(cam, p);
      if (open) {
        console.log(`  -> Port ${p} is OPEN`);
      }
    }
  }
}

main();
