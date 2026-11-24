// Optional local CORS proxy for OpenAI-compatible APIs (e.g. AMD TokenLab).
// Node built-ins only. NOT started by the game; the app stays pure front-end.
// Usage: node proxy/ai-proxy.mjs  (env: PORT, TARGET_BASE_URL, AMD_API_KEY)
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT || 8787);
const TARGET = new URL(process.env.TARGET_BASE_URL || 'https://api.tokenlab.amd.com/v1');
if (TARGET.protocol !== 'https:') {
  console.error('TARGET_BASE_URL must be https');
  process.exit(1);
}
const KEY_OVERRIDE = (process.env.AMD_API_KEY || '').trim();
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Max-Age': '86400',
};
const RELAY_PATH = TARGET.pathname.replace(/\/$/, '') + '/chat/completions';

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    res.writeHead(405, { ...CORS, 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }
  const chunks = [];
  req.on('data', c => {
    if (chunks.length < 64) chunks.push(c); // 4MB cap roughly
  });
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const headers = {
      'Content-Type': req.headers['content-type'] || 'application/json',
    };
    const browserKey = String(req.headers.authorization || '');
    headers.Authorization = KEY_OVERRIDE ? 'Bearer ' + KEY_OVERRIDE : browserKey;
    if (!headers.Authorization) {
      res.writeHead(401, { ...CORS, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Missing API key', type: 'invalid_request_error' } }));
      return;
    }
    const upstream = https.request({
      hostname: TARGET.hostname,
      port: TARGET.port || 443,
      path: RELAY_PATH,
      method: 'POST',
      headers,
    }, up => {
      const out = [];
      up.on('data', c => out.push(c));
      up.on('end', () => {
        res.writeHead(up.statusCode || 502, { ...CORS, 'Content-Type': up.headers['content-type'] || 'application/json' });
        res.end(Buffer.concat(out));
      });
    });
    upstream.on('error', err => {
      res.writeHead(502, { ...CORS, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Upstream request failed: ' + err.message } }));
    });
    upstream.end(body);
  });
});
server.listen(PORT, '127.0.0.1', () => {
  console.log('AI proxy ready: http://127.0.0.1:' + PORT + '/v1  ->  ' + TARGET.origin + TARGET.pathname);
  console.log('Set the game Base URL to http://127.0.0.1:' + PORT + '/v1 and pick the matching model.');
  console.log('Optional env AMD_API_KEY overrides the browser key so it need not be stored in the page.');
});
