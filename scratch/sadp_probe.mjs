import dgram from 'dgram';

const sadpProbe = `<?xml version="1.0" encoding="utf-8"?><Probe><Uuid>a816bf67-3475-4c07-b371-2e6fbda441c9</Uuid><Types>inquiry</Types></Probe>`;

const client = dgram.createSocket({ type: 'udp4', reuseAddr: true });

client.on('error', (err) => console.log('SADP Error:', err.message));

client.on('message', (msg, rinfo) => {
  console.log(`\n=== SADP RESPONSE FROM ${rinfo.address}:${rinfo.port} ===`);
  console.log(msg.toString('utf-8'));
});

client.bind(0, () => {
  client.setBroadcast(true);
  const buf = Buffer.from(sadpProbe, 'utf-8');
  client.send(buf, 0, buf.length, 37020, '239.255.255.250', (err) => {
    if (err) console.log('Send error:', err);
    else console.log('Sent SADP probe to 239.255.255.250:37020');
  });
  client.send(buf, 0, buf.length, 37020, '255.255.255.255', (err) => {
    if (err) console.log('Send error 255:', err);
    else console.log('Sent SADP probe to 255.255.255.255:37020');
  });
  setTimeout(() => {
    client.close();
    console.log('\nSADP probe finished.');
  }, 3000);
});
