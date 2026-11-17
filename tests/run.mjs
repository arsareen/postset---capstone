// Test runner for PostSet. No dependencies: Node 22+ and Google Chrome.
//
//   node tests/run.mjs            run every tests/*.test.mjs
//   node tests/run.mjs upload     run only tests whose name contains "upload"
//   SHOW=1 node tests/run.mjs     watch it happen in a visible Chrome window
//
// How it works:
//   - serves src/ on a local port. /config.js is replaced with a fake config,
//     and /__fixtures/ serves the small video and image in tests/fixtures/.
//   - opens Chrome headless and drives it over the DevTools protocol.
//   - when a page asks the CDN for supabase-js, it gets tests/fake-supabase.js
//     instead, so tests never touch the real Supabase project.
//     Any other outside request (fonts) gets an empty reply.
//   - every test runs in its own fresh browser profile, so nothing leaks between them.
//
// A test file exports an object of { 'test name': async (t) => { ... } }.
// See the helper `t` below for what a test can do.

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SRC = path.join(ROOT, 'src');
const FIXTURES = path.join(HERE, 'fixtures');
const FAKE = fs.readFileSync(path.join(HERE, 'fake-supabase.js'), 'utf8');
const DB_KEY = '__postset_fake_db';
const TIMEOUT = 5000;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webp': 'image/webp' };

// ---------- static server ----------
function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/config.js') {
      res.writeHead(200, { 'content-type': 'text/javascript' });
      return res.end("window.POSTSET_CONFIG = { url: 'https://fake.supabase.test', anonKey: 'fake-key' };");
    }
    const base = url.pathname.startsWith('/__fixtures/') ? FIXTURES : SRC;
    const rel = decodeURIComponent(url.pathname.replace(/^\/__fixtures\//, '/')).replace(/^\/$/, '/index.html');
    const file = path.join(base, path.normalize(rel));
    if (!file.startsWith(base) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); return res.end('not found');
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

// ---------- Chrome over the DevTools protocol ----------
function findChrome() {
  const options = [process.env.CHROME,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'];
  const found = options.find((p) => p && fs.existsSync(p));
  if (!found) throw new Error('Google Chrome not found. Install it, or set CHROME=/path/to/chrome');
  return found;
}

async function startChrome() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'postset-chrome-'));
  const args = ['--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--window-size=430,932',
    '--autoplay-policy=no-user-gesture-required', 'about:blank'];
  if (!process.env.SHOW) args.unshift('--headless=new');
  const proc = spawn(findChrome(), args, { stdio: 'ignore' });
  const portFile = path.join(profile, 'DevToolsActivePort');
  // Chrome writes "<port>\n<path>" here once it's listening; wait until both lines are in.
  let port, wsPath;
  for (let i = 0; i < 100 && !wsPath; i++) {
    try { [port, wsPath] = fs.readFileSync(portFile, 'utf8').trim().split('\n'); } catch {}
    if (!wsPath) await sleep(100);
  }
  if (!wsPath) throw new Error('Chrome did not start');
  const ws = new WebSocket(`ws://127.0.0.1:${port}${wsPath}`);
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });

  let nextId = 1;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { ok, fail } = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? fail(new Error(msg.error.message)) : ok(msg.result);
    } else if (msg.method) listeners.forEach((l) => l(msg));
  };
  const send = (method, params = {}, sessionId) => new Promise((ok, fail) => {
    const id = nextId++;
    pending.set(id, { ok, fail });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  const close = async () => {
    try { ws.close(); } catch {}
    const exited = new Promise((r) => proc.once('exit', r));
    proc.kill();
    await Promise.race([exited, sleep(2000)]);
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3 }); } catch {}
  };
  return { send, on: (fn) => listeners.push(fn), off: (fn) => listeners.splice(listeners.indexOf(fn), 1), close };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- the helper each test gets ----------
async function newPage(chrome, origin) {
  const { browserContextId } = await chrome.send('Target.createBrowserContext');
  const { targetId } = await chrome.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await chrome.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params) => chrome.send(method, params, sessionId);
  const errors = [];

  const onEvent = (msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === 'Fetch.requestPaused') {
      const { requestId, request } = msg.params;
      if (request.url.startsWith(origin)) return send('Fetch.continueRequest', { requestId }).catch(() => {});
      const body = /supabase-js/.test(request.url) ? FAKE : '';
      const type = /supabase-js/.test(request.url) ? 'text/javascript' : 'text/css';
      send('Fetch.fulfillRequest', { requestId, responseCode: 200,
        responseHeaders: [{ name: 'content-type', value: type }, { name: 'access-control-allow-origin', value: '*' }],
        body: Buffer.from(body).toString('base64') }).catch(() => {});
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      errors.push((d.exception && d.exception.description) || d.text);
    }
  };
  chrome.on(onEvent);
  await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

  async function js(expr, ...args) {
    const src = typeof expr === 'function' ? `(${expr})(...${JSON.stringify(args)})` : expr;
    const r = await send('Runtime.evaluate', { expression: src, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('In the page: ' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text));
    return r.result.value;
  }

  async function waitFor(check, { timeout = TIMEOUT, what } = {}) {
    // A CSS selector, or a function (or function source) run in the page.
    const isSelector = typeof check === 'string' && !/^\s*(async\s*)?\(/.test(check);
    const fn = isSelector ? `!!document.querySelector(${JSON.stringify(check)})` : `(${check})()`;
    const end = Date.now() + timeout;
    let last;
    while (Date.now() < end) {
      try { if (await js(fn)) return; } catch (e) { last = e; }
      await sleep(50);
    }
    const page = await js('location.pathname + location.search').catch(() => '?');
    throw new Error(`Waited ${timeout}ms for ${what || check} on ${page}` + (last ? ` (${last.message})` : ''));
  }

  const t = {
    // Put rows in the fake database before the first open(). Missing tables start empty.
    // `signedInAs` (a user id from `users`) starts the test signed in.
    async seed({ signedInAs, ...tables } = {}) {
      const db = { users: [], session: null, shows: [], setlist_songs: [], clips: [], storage: [], seq: 1000, log: [], ...tables };
      if (signedInAs) {
        const u = db.users.find((x) => x.id === signedInAs);
        if (!u) throw new Error(`seed: no user with id ${signedInAs}`);
        db.session = { user: { id: u.id, email: u.email } };
      }
      const json = JSON.stringify(JSON.stringify(db));
      await send('Page.addScriptToEvaluateOnNewDocument', { source:
        `if (location.origin === ${JSON.stringify(origin)} && !sessionStorage.getItem('__seeded')) {
           sessionStorage.setItem(${JSON.stringify(DB_KEY)}, ${json}); sessionStorage.setItem('__seeded', '1'); }` });
    },
    // Go to a page under src/, e.g. t.open('song.html?id=3'). Waits for it to load.
    async open(page) {
      const loaded = new Promise((ok) => {
        const l = (m) => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') { chrome.off(l); ok(); } };
        chrome.on(l);
      });
      await send('Page.navigate', { url: `${origin}/${page.replace(/^\//, '')}` });
      await Promise.race([loaded, sleep(TIMEOUT)]);
    },
    waitFor,
    // Wait until the text shows up anywhere on the page (or inside `selector`).
    async waitForText(text, selector = 'body') {
      await waitFor(`() => { const el = document.querySelector(${JSON.stringify(selector)}); return !!el && el.textContent.includes(${JSON.stringify(text)}); }`,
        { what: `"${text}" in ${selector}` });
    },
    async click(selector) {
      await waitFor(selector);
      await js((s) => document.querySelector(s).click(), selector);
    },
    // Click the first link or button whose text contains `text`.
    async clickText(text, selector = 'a, button, [role=button], label') {
      const find = `() => [...document.querySelectorAll(${JSON.stringify(selector)})].find((el) => el.textContent.includes(${JSON.stringify(text)}))`;
      await waitFor(find, { what: `a clickable "${text}"` });
      await js(`(${find})().click()`);
    },
    // Type into an input like a person would (focus, then key in the text).
    async type(selector, text) {
      await waitFor(selector);
      await js((s) => { const el = document.querySelector(s); el.focus(); el.value = ''; }, selector);
      await send('Input.insertText', { text });
      await js((s) => document.querySelector(s).dispatchEvent(new Event('change', { bubbles: true })), selector);
    },
    // Pick a file in an <input type=file>. `file` is a name in tests/fixtures/.
    async chooseFile(selector, file) {
      await waitFor(selector);
      const { result } = await send('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(selector)})` });
      await send('DOM.setFileInputFiles', { objectId: result.objectId, files: [path.join(FIXTURES, file)] });
    },
    async text(selector = 'body') {
      await waitFor(selector);
      return js((s) => document.querySelector(s).textContent.replace(/\s+/g, " ").trim(), selector);
    },
    async count(selector) { return js((s) => document.querySelectorAll(s).length, selector); },
    async url() { return js('location.pathname.split("/").pop() + location.search'); },
    js,
    // The fake database as it is right now.
    async db() { return js('window.__fakeDb ? window.__fakeDb() : null'); },
    async screenshot(name) {
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      const out = path.join(HERE, 'screenshots', `${name}.png`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, Buffer.from(data, 'base64'));
      return out;
    },
    errors,
  };

  const close = async () => {
    chrome.off(onEvent);
    await chrome.send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  };
  return { t, close };
}

// ---------- assertions for tests ----------
export function expect(actual) {
  const fail = (msg) => { throw new Error(msg); };
  const show = (v) => JSON.stringify(v);
  return {
    toBe: (want) => { if (actual !== want) fail(`Expected ${show(want)}, got ${show(actual)}`); },
    toEqual: (want) => { if (show(actual) !== show(want)) fail(`Expected ${show(want)}, got ${show(actual)}`); },
    toContain: (want) => { if (!actual || !actual.includes(want)) fail(`Expected ${show(actual)} to contain ${show(want)}`); },
    notToContain: (want) => { if (actual && actual.includes(want)) fail(`Expected ${show(actual)} not to contain ${show(want)}`); },
    toBeTruthy: () => { if (!actual) fail(`Expected something truthy, got ${show(actual)}`); },
  };
}

// ---------- run ----------
async function main() {
  const filter = (process.argv[2] || '').toLowerCase();
  const files = fs.readdirSync(HERE).filter((f) => f.endsWith('.test.mjs')).sort();
  const tests = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(path.join(HERE, f)));
    for (const [name, fn] of Object.entries(mod.default || {})) {
      if (!filter || name.toLowerCase().includes(filter) || f.toLowerCase().includes(filter)) tests.push({ file: f, name, fn });
    }
  }
  if (!tests.length) { console.log('No tests found' + (filter ? ` matching "${filter}"` : '') + '.'); process.exit(1); }

  const server = await startServer();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const chrome = await startChrome();
  let passed = 0;
  const failed = [];
  const started = Date.now();

  for (const test of tests) {
    const { t, close } = await newPage(chrome, origin);
    const t0 = Date.now();
    try {
      await test.fn(t);
      passed++;
      console.log(`  \x1b[32m✓\x1b[0m ${test.name} \x1b[2m(${Date.now() - t0}ms)\x1b[0m`);
    } catch (e) {
      const shot = await t.screenshot(test.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()).catch(() => null);
      failed.push(test);
      console.log(`  \x1b[31m✗ ${test.name}\x1b[0m  \x1b[2m${test.file}\x1b[0m`);
      console.log(`      ${e.message}`);
      if (t.errors.length) console.log(`      Page errors:\n        ${t.errors.join('\n        ')}`);
      if (shot) console.log(`      Screenshot: ${path.relative(ROOT, shot)}`);
    }
    await close();
  }

  await chrome.close();
  server.close();
  console.log(`\n${passed} passed, ${failed.length} failed (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  process.exit(failed.length ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
