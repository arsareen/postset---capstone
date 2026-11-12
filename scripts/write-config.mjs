// Writes src/config.js from .env so the browser can reach Supabase.
//
//   node scripts/write-config.mjs
//
// The page is plain HTML served by python, so it can't read .env itself.
// src/config.js is gitignored, like .env. SUPABASE_ANON_KEY is the
// publishable key: it is meant to be in the browser, and the access rules in
// supabase/schema.sql are what protect the data. Never put the service_role
// key in .env for this app.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let text;
try {
  text = readFileSync(join(root, '.env'), 'utf8');
} catch {
  console.error('No .env found. Copy .env.example to .env and fill in your Supabase values.');
  process.exit(1);
}

const env = {};
for (const line of text.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
}

const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'].filter((k) => !env[k] || env[k].includes('YOUR_'));
if (missing.length) {
  console.error('Fill in ' + missing.join(' and ') + ' in .env first (see .env.example).');
  process.exit(1);
}
if (/service_role|^sb_secret_/.test(env.SUPABASE_ANON_KEY)) {
  console.error('SUPABASE_ANON_KEY looks like a secret key. Use the anon / publishable key instead.');
  process.exit(1);
}

// The Project URL is just https://<project id>.supabase.co. Supabase also
// shows longer addresses (…/rest/v1/) and the dashboard has its own; the app
// adds the paths itself, so anything after the domain breaks every request.
let url;
try {
  url = new URL(env.SUPABASE_URL);
} catch {
  console.error('SUPABASE_URL isn’t a web address. It should look like https://abcdefghijklmnopqrst.supabase.co');
  process.exit(1);
}
if (/(^|\.)supabase\.com$/.test(url.hostname)) {
  console.error('SUPABASE_URL is the dashboard address. Use the Project URL instead: https://<project id>.supabase.co ' +
    '(Project Settings → Data API, or the Connect button).');
  process.exit(1);
}
if (url.protocol !== 'https:') {
  console.error('SUPABASE_URL must start with https://');
  process.exit(1);
}
if (url.pathname !== '/' || url.search) {
  console.log('Note: using ' + url.origin + ' — the part after the domain (' + url.pathname + url.search + ') isn’t needed, so it was left out.');
}

const out = '// Written by scripts/write-config.mjs from .env. Not committed.\n' +
  'window.POSTSET_CONFIG = ' + JSON.stringify({ url: url.origin, anonKey: env.SUPABASE_ANON_KEY }, null, 2) + ';\n';
writeFileSync(join(root, 'src', 'config.js'), out);
console.log('Wrote src/config.js');
