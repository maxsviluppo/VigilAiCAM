import dgram from 'dgram';

const probe = '<?xml version="1.0" encoding="utf-8"?><Probe><Uuid>a816bf67-3475-4c07-b371-2e6fbda441c9</Uuid><Types>inquiry</Types></Probe>';

const client = dgram.createSocket('udp4');
client.on('message', (msg, rinfo) => {
  console.log('UNICAST SADP REPLY from ' + rinfo.address + ':');
  console.log(msg.toString('utf-8'));
});

client.bind(0, () => {
  const buf = Buffer.from(probe);
  client.send(buf, 0, buf.length, 37020, '192.168.1.34', (err) => {
    if (err) console.error('Send error:', err);
    else console.log('Sent unicast SADP probe to 192.168.1.34:37020');
  });
  setTimeout(() => client.close(), 2000);
});
