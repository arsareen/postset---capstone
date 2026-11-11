// D08 checks: the four CRUD lines from docs/features/d08-clips-crud.md,
// run through the real Clips screen in headless Chrome. No dependencies.
//
//   python3 -m http.server 8000 --directory src     (in one terminal)
//   node tests/checks/d08-clips.mjs                  (in another)
//
// Uses a throwaway Chrome profile, so your own browser's saved clips are untouched.
// Set CHROME=/path/to/chrome or BASE=http://... to override the defaults.

import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.env.BASE || 'http://localhost:8000/';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9334;

const work = mkdtempSync(join(tmpdir(), 'postset-d08-'));
const video = (name) => { const p = join(work, name); writeFileSync(p, 'not really a video'); return p; };

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(work, 'profile')}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let target;
for (let i = 0; i < 40 && !target; i++) {
  await sleep(250);
  try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === 'page'); } catch {}
}
if (!target) { console.error('Could not start Chrome at', CHROME); process.exit(2); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let seq = 0; const pending = new Map(); const pageErrors = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') pageErrors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
});
const send = (method, params = {}) => new Promise((r) => { const n = ++seq; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const js = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.result.value;
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

const go = async (path) => { await send('Page.navigate', { url: BASE + path }); await sleep(700); };
const q = (s) => JSON.stringify(s);

// Fill the Add (or Edit) form the way a person would, then press Save.
async function fillAndSave(prefix, { event, song, file }) {
  if (event) await js(`(() => { const s = document.getElementById(${q(prefix + '-event')}); s.value = ${q(event)}; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  if (song !== undefined) await js(`(() => { const s = document.getElementById(${q(prefix + '-song')}); s.value = ${q(song)}; s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  if (file) {
    await send('DOM.enable');
    const doc = await send('DOM.getDocument');
    const node = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '#' + prefix + '-file' });
    await send('DOM.setFileInputFiles', { nodeId: node.result.nodeId, files: [file] });
    await sleep(100);
  }
  await js(`document.querySelector('#${prefix}-form button[type=submit]').click()`);
  await sleep(800);
}

async function addClip(event, song, filename) {
  await go(`clips.html?event=${event}#add`);
  await fillAndSave('add', { event, song, file: video(filename) });
}

// What a person sees on a song's screen: its title and the filenames listed.
async function openSong(event, key) {
  await go(`clips.html?event=${event}&song=${encodeURIComponent(key)}#song`);
  return js(`({ title: document.getElementById('song-title').textContent,
               show: document.getElementById('song-show').textContent,
               files: [...document.querySelectorAll('#song-clips .clip-file')].map(e => e.textContent) })`);
}

const stored = () => js(`JSON.parse(localStorage.getItem('postset.clips') || '[]')`);
const results = [];
function report(name, pass, evidence) {
  results.push(pass);
  console.log(`\n${pass ? 'PASS' : 'FAIL'}  ${name}`);
  for (const line of evidence) console.log('      ' + line);
}

// Start from nothing.
await go('clips.html'); await js('localStorage.clear()');

// 1 · Create
await addClip('mira-vale', 'ID', 'IMG_0001.MOV');
await addClip('mira-vale', 'Ferris', 'IMG_0002.MOV');
await go('clips.html'); // a fresh load, so nothing is left over in memory
{
  const screen = await openSong('mira-vale', 'id');
  const row = (await stored()).find((c) => c.filename === 'IMG_0001.MOV');
  const pass = screen.files.includes('IMG_0001.MOV') && screen.title === 'ID' && screen.show === 'Mira Vale'
    && row && row.eventSlug === 'mira-vale' && row.songTitle === 'ID' && row.filename === 'IMG_0001.MOV';
  report('Create — event, song tag and filename all saved, including a clip tagged "ID"', pass, [
    'added through the form: Mira Vale / "ID" / IMG_0001.MOV and Mira Vale / "Ferris" / IMG_0002.MOV, then reloaded',
    `"ID" song screen shows: title ${q(screen.title)}, show ${q(screen.show)}, files ${q(screen.files)}`,
    `saved record: ${row ? q({ eventSlug: row.eventSlug, songTitle: row.songTitle, filename: row.filename }) : 'MISSING'}`,
  ]);
}

// 2 · Read
await addClip('mira-vale', 'Ferris', 'IMG_0003.MOV');
await addClip('mira-vale', 'Glasshouse', 'IMG_0004.MOV');
{
  const ferris = await openSong('mira-vale', 'ferris');
  const glass = await openSong('mira-vale', 'glasshouse');
  const pass = ferris.files.length === 2 && ferris.files.includes('IMG_0002.MOV') && ferris.files.includes('IMG_0003.MOV')
    && !ferris.files.includes('IMG_0004.MOV') && glass.files.length === 1 && glass.files[0] === 'IMG_0004.MOV';
  report('Read — a song shows every one of its clips and nothing from the other song', pass, [
    'clips saved: Ferris ×2 (IMG_0002, IMG_0003), Glasshouse ×1 (IMG_0004), ID ×1 (IMG_0001)',
    `opened Ferris: ${q(ferris.files)}`,
    `opened Glasshouse: ${q(glass.files)}`,
  ]);
}

// 3 · Update
{
  await openSong('mira-vale', 'id');
  const editHref = await js(`[...document.querySelectorAll('#song-clips .clip-row')].find(r => r.querySelector('.clip-file').textContent === 'IMG_0001.MOV').querySelector('a').getAttribute('href')`);
  await go(editHref);
  await fillAndSave('edit', { song: 'Paper Moons' });
  const paper = await openSong('mira-vale', 'paper moons');
  const id = await openSong('mira-vale', 'id');
  const pass = paper.files.includes('IMG_0001.MOV') && !id.files.includes('IMG_0001.MOV');
  report('Update — retag "ID" → a real song; the clip moves to it and leaves "ID"', pass, [
    'opened "ID", pressed Edit on IMG_0001.MOV, changed the song to "Paper Moons", saved',
    `opened Paper Moons: ${q(paper.files)}`,
    `opened ID: ${q(id.files)}`,
  ]);
}

// 4 · Delete
{
  const before = await stored();
  await openSong('mira-vale', 'ferris');
  await js(`[...document.querySelectorAll('#song-clips .clip-row')].find(r => r.querySelector('.clip-file')?.textContent === 'IMG_0002.MOV').querySelector('[data-delete]').click()`);
  await sleep(150);
  const asked = await js(`document.querySelector('#song-clips .confirm-row')?.innerText.replace(/\\s+/g, ' ').trim()`);
  await js(`document.querySelector('[data-confirm]').click()`);
  await sleep(200);
  const status = await js(`document.getElementById('song-status').textContent`);
  const ferris = await openSong('mira-vale', 'ferris');
  const after = await stored();
  const gone = before.find((c) => c.filename === 'IMG_0002.MOV');
  const othersBefore = before.filter((c) => c.id !== gone.id);
  const untouched = othersBefore.length === after.length && othersBefore.every((c) => JSON.stringify(c) === JSON.stringify(after.find((a) => a.id === c.id)));
  const pass = !ferris.files.includes('IMG_0002.MOV') && ferris.files.includes('IMG_0003.MOV') && untouched;
  report('Delete — the clip is gone from its song and every other clip is untouched', pass, [
    `pressed Delete on IMG_0002.MOV; the row asked: ${q(asked)}; pressed Yes; status: ${q(status)}`,
    `opened Ferris: ${q(ferris.files)}`,
    `clips saved before: ${before.length}, after: ${after.length}; the other ${othersBefore.length} identical to before: ${untouched}`,
  ]);
}

console.log(`\n${results.filter(Boolean).length} of ${results.length} checks passed · page errors: ${pageErrors.length ? q(pageErrors) : 'none'}`);
ws.close();
const closed = new Promise((r) => chrome.once('exit', r));
chrome.kill();
await closed; // Chrome writes to its profile until it exits
rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
process.exit(results.every(Boolean) && !pageErrors.length ? 0 : 1);
