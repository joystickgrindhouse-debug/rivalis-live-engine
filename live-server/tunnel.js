/**
 * Simple HTTP Tunnel for Termux
 * Exposes local Live Server to the internet via a public tunnel
 * No external dependencies needed - uses HTTP forwarding
 */

const http = require('http');
const https = require('https');
const url = require('url');

const TUNNEL_SERVER = process.env.TUNNEL_SERVER || 'https://tunnel.rivalis.dev';
const LOCAL_PORT = process.env.PORT || 8080;
const TUNNEL_ID = process.env.TUNNEL_ID || `rivalis-${Date.now()}`;

console.log(`🌐 Tunnel Client Started`);
console.log(`📍 Tunnel ID: ${TUNNEL_ID}`);
console.log(`🔗 Local Server: http://localhost:${LOCAL_PORT}`);
console.log(`🌍 Public URL: ${TUNNEL_SERVER}/${TUNNEL_ID}`);

// Keep tunnel connection alive
function connectTunnel() {
  const options = {
    hostname: new URL(TUNNEL_SERVER).hostname,
    port: 443,
    path: '/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const req = https.request(options, (res) => {
    console.log(`✅ Tunnel registered (${res.statusCode})`);
  });

  req.on('error', (err) => {
    console.error('❌ Tunnel registration failed:', err.message);
    setTimeout(connectTunnel, 5000); // Retry in 5 seconds
  });

  req.write(JSON.stringify({ tunnelId: TUNNEL_ID }));
  req.end();
}

// Proxy requests to local server
function proxyRequest(tunnelReq, tunnelRes) {
  const parsedUrl = url.parse(`http://localhost:${LOCAL_PORT}${tunnelReq.url}`, true);

  const options = {
    hostname: 'localhost',
    port: LOCAL_PORT,
    path: tunnelReq.url,
    method: tunnelReq.method,
    headers: tunnelReq.headers,
  };

  const localReq = http.request(options, (localRes) => {
    tunnelRes.writeHead(localRes.statusCode, localRes.headers);
    localRes.pipe(tunnelRes);
  });

  localReq.on('error', (err) => {
    console.error(`❌ Local request failed: ${err.message}`);
    tunnelRes.writeHead(502, { 'Content-Type': 'application/json' });
    tunnelRes.end(JSON.stringify({ error: 'Bad Gateway', message: err.message }));
  });

  if (tunnelReq.method !== 'GET' && tunnelReq.method !== 'HEAD') {
    tunnelReq.pipe(localReq);
  } else {
    localReq.end();
  }
}

// Simple tunnel server (listener)
const server = http.createServer((req, res) => {
  if (req.url.startsWith(`/${TUNNEL_ID}`)) {
    // Strip tunnel ID from path
    const originalUrl = req.url.replace(`/${TUNNEL_ID}`, '') || '/';
    req.url = originalUrl;
    proxyRequest(req, res);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(3000, () => {
  console.log(`🔄 Local tunnel listening on port 3000`);
});

// Register tunnel every 30 seconds
setInterval(connectTunnel, 30000);
connectTunnel();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n✋ Tunnel stopping...');
  server.close(() => {
    console.log('🛑 Tunnel stopped');
    process.exit(0);
  });
});

console.log(`\n✅ Tunnel ready! Share this URL with remote players:`);
console.log(`${TUNNEL_SERVER}/${TUNNEL_ID}/lobby-preview.html`);
