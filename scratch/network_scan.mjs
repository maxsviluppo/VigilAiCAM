import net from 'net';
import dgram from 'dgram';
import os from 'os';
import { execSync } from 'child_process';

console.log('=== VIGILAI NETWORK DIAGNOSTIC SCAN ===');
console.log('Timestamp:', new Date().toISOString());

// 1. Interfaces
const interfaces = os.networkInterfaces();
console.log('\n--- NETWORK INTERFACES ---');
for (const [name, addrs] of Object.entries(interfaces)) {
  for (const a of addrs) {
    if (a.family === 'IPv4') {
      console.log(`- ${name}: ${a.address} (netmask ${a.netmask}, internal: ${a.internal})`);
    }
  }
}

// 2. Discover cameras via WS-Discovery (UDP Multicast)
async function runWsDiscovery() {
  console.log('\n--- 1. WS-DISCOVERY (UDP 239.255.255.250:3702) ---');
  return new Promise((resolve) => {
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    const discovered = [];

    socket.on('error', (err) => {
      console.log('WS-Discovery error:', err.message);
      resolve(discovered);
    });

    socket.on('message', (msg, rinfo) => {
      console.log(`[WS-Discovery] Reply from ${rinfo.address}:${rinfo.port}`);
      const str = msg.toString('utf-8');
      discovered.push({ ip: rinfo.address, port: rinfo.port, raw: str });
    });

    socket.bind(0, () => {
      try {
        socket.setBroadcast(true);
        socket.setMulticastTTL(4);

        const probe = `<?xml version="1.0" encoding="UTF-8"?>
<e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope"
            xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing"
            xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"
            xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
  <e:Header>
    <w:MessageID>uuid:a816bf67-3475-4c07-b371-2e6fbda441c9</w:MessageID>
    <w:To e:mustUnderstand="true">urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>
    <w:Action a:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action>
  </e:Header>
  <e:Body>
    <d:Probe>
      <d:Types>dn:NetworkVideoTransmitter</d:Types>
    </d:Probe>
  </e:Body>
</e:Envelope>`;

        const buf = Buffer.from(probe);
        socket.send(buf, 0, buf.length, 3702, '239.255.255.250', (err) => {
          if (err) console.log('WS-Discovery send error:', err.message);
          else console.log('WS-Discovery probe sent to 239.255.255.250:3702');
        });
      } catch (err) {
        console.log('WS-Discovery setup error:', err.message);
      }
    });

    setTimeout(() => {
      try { socket.close(); } catch {}
      console.log(`WS-Discovery completed. Found: ${discovered.length} device(s).`);
      resolve(discovered);
    }, 3000);
  });
}

// 3. Fast TCP port checker
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

// 4. Subnet Scan
async function scanSubnet(subnetPrefix, startHost = 1, endHost = 254) {
  console.log(`\n--- 2. SCANNING SUBNET ${subnetPrefix}.0/24 (Hosts ${startHost}-${endHost}) ---`);
  const portsToTest = [
    { port: 554, name: 'RTSP (Stream Video)' },
    { port: 2020, name: 'ONVIF (Tapo Control)' },
    { port: 80, name: 'HTTP Web' },
    { port: 8000, name: 'Hikvision Service' },
    { port: 8899, name: 'ONVIF Alt' },
    { port: 22, name: 'SSH (Raspberry Pi)' },
    { port: 3000, name: 'VigilAI Dashboard' }
  ];

  console.log(`Testing ports: ${portsToTest.map(p => p.port).join(', ')}...`);

  const results = [];
  const concurrency = 30;
  const hosts = [];
  for (let i = startHost; i <= endHost; i++) {
    hosts.push(`${subnetPrefix}.${i}`);
  }

  for (let i = 0; i < hosts.length; i += concurrency) {
    const chunk = hosts.slice(i, i + concurrency);
    await Promise.all(chunk.map(async (ip) => {
      const openPorts = [];
      for (const p of portsToTest) {
        const isOpen = await checkPort(ip, p.port, 250);
        if (isOpen) {
          openPorts.push(p);
        }
      }
      if (openPorts.length > 0) {
        console.log(`FOUND ACTIVE HOST: ${ip} -> Open ports: ${openPorts.map(p => `${p.port} (${p.name})`).join(', ')}`);
        results.push({ ip, openPorts });
      }
    }));
  }

  console.log(`Subnet scan for ${subnetPrefix}.0/24 finished. Found ${results.length} responsive host(s).`);
  return results;
}

// 5. Check ARP table
function checkArpTable() {
  console.log('\n--- 3. ARP TABLE CHECK ---');
  try {
    const out = execSync('arp -a', { encoding: 'utf-8' });
    console.log(out);
  } catch (err) {
    console.log('Error reading ARP:', err.message);
  }
}

async function main() {
  await runWsDiscovery();
  // Scan 192.168.1.x
  await scanSubnet('192.168.1', 1, 254);
  // Also check if 192.168.10.x has anything (in case Raspberry Pi LAN or router assigned it)
  await scanSubnet('192.168.10', 1, 30);
  checkArpTable();
  console.log('\n=== DIAGNOSTIC COMPLETE ===');
}

main().catch(console.error);
