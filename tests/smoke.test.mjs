// Smoke test: proves the harness works end to end (the server, Chrome, the
// fake Supabase, and seeding). It isn't one of the acceptance-criteria tests.
import { expect } from './run.mjs';

const fan = { id: 'u-fan', email: 'fan@test.dev', password: 'secret123' };
const show = { id: 1, slug: 'anotr-pacha-nyc', artist: 'ANOTR', venue: 'Pacha NYC', date_local: '2026-10-10', cover: null };

export default {
  'signed out, the home page sends you to sign in': async (t) => {
    await t.seed({ users: [fan], shows: [show] });
    await t.open('index.html');
    await t.waitFor(async () => location.pathname.endsWith('signin.html'));
    expect(await t.url()).toContain('signin.html');
  },

  'signed in, the home page lists a seeded show': async (t) => {
    await t.seed({ users: [fan], shows: [show], signedInAs: fan.id });
    await t.open('index.html');
    await t.waitForText('Pacha NYC', '#shows');
    expect(await t.text('#shows')).toContain('ANOTR');
    expect(t.errors).toEqual([]);
  },
};
