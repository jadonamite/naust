import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { render, policyPaths } from './view.mjs';
import { sampleSnapshot, liveSnapshot } from './source.mjs';

const styles = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
const headers = {
  'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store',
  'content-security-policy': "default-src 'none'; style-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer',
};

export function application(store, { token = randomBytes(32).toString('hex'), origin, fetcher } = {}) {
  if (!origin) throw new Error('A loopback server origin is required.');
  let busy = false;
  let lastSnapshot = null;
  return async (request) => {
    const url = new URL(request.url);
    if (url.origin !== origin || request.headers.get('host') !== new URL(origin).host) return new Response('Unrecognized local host.', { status: 403 });
    if (request.method === 'GET') {
      if (url.pathname === '/styles.css') return new Response(styles, { headers: { ...headers, 'content-type': 'text/css; charset=utf-8' } });
      if (url.pathname === '/' || policyPaths.includes(url.pathname)) return new Response(render(store.view(), token, url.pathname), { headers });
      return new Response('Page not found.', { status: 404, headers });
    }
    if (request.method !== 'POST' || !['/advance', '/replay', '/sync'].includes(url.pathname)) return new Response('Method or route not allowed.', { status: 405, headers });
    const requestOrigin = request.headers.get('origin');
    if (requestOrigin && requestOrigin !== origin) return new Response('Cross-origin request refused.', { status: 403, headers });
    if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return new Response('Expected a form.', { status: 415, headers });
    const body = await request.text();
    if (body.length > 1024) return new Response('Form too large.', { status: 413, headers });
    const supplied = new URLSearchParams(body).get('token') ?? '';
    if (Buffer.byteLength(supplied) !== Buffer.byteLength(token) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))) return new Response('Form token expired. Reload the page and retry.', { status: 403, headers });
    if (busy) return new Response('A sync is already running. Wait for it to finish.', { status: 409, headers });
    busy = true;
    try {
      if (url.pathname === '/advance') {
        if (store.config.mode !== 'sample') throw new Error('Sample walkthrough is unavailable in live mode.');
        const stage = Math.min(store.stage() + 1, 2);
        const snapshot = sampleSnapshot(stage);
        store.reconcile(snapshot, stage);
        lastSnapshot = snapshot;
      } else if (url.pathname === '/replay') {
        if (store.config.mode === 'sample') store.reconcile(sampleSnapshot(store.stage()));
        else if (lastSnapshot) store.reconcile(lastSnapshot);
        else throw new Error('Sync the live source once in this process before replaying its last snapshot.');
      } else {
        if (store.config.mode !== 'live') throw new Error('Live sync is unavailable in sample mode.');
        const snapshot = await liveSnapshot(store.config, fetcher);
        store.reconcile(snapshot);
        lastSnapshot = snapshot;
      }
    } catch (error) { store.fail(error); }
    finally { busy = false; }
    return new Response(null, { status: 303, headers: { ...headers, location: '/' } });
  };
}

export function serve(store, port) {
  const origin = `http://127.0.0.1:${port}`;
  const handle = application(store, { origin });
  const server = createServer(async (req, res) => {
    try {
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 1024) { res.writeHead(413, headers); res.end('Request too large.'); return; }
        chunks.push(chunk);
      }
      const method = req.method ?? 'GET';
      const request = new Request(new URL(req.url ?? '/', origin), { method, headers: req.headers,
        ...(method !== 'GET' && method !== 'HEAD' ? { body: Buffer.concat(chunks) } : {}),
      });
      const response = await handle(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch { res.writeHead(500, headers); res.end('Local request failed. Check the terminal and retry.'); }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.on('error', (error) => { console.error(`Local server could not start: ${error.message}`); store.close(); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Customer funding reference: ${origin} (${store.config.mode}; local demonstration balances)`));
  return server;
}
