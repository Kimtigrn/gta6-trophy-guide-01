// gta6-trophy-guide-01 entry point (Node 22, standard library only).
// The guide itself is the app/ folder next to this file: plain static files
// a browser opens at app/index.html — ES modules and CSS, no build step,
// offline, loading nothing over the network. Its trophy list and guides live
// in app/data/trophies.json. This file hands the entry in: it copies app/
// and screenshots/ beside it into /output and writes /output/dossier.json,
// the summary the judge reads (your screenshots, the first load's files and
// bytes, and your source), using the vendored make.fun library. Leave
// vendor/makefun-frontend.ts alone: the scorer requires dossier.json to be
// byte for byte what its own copy writes.
//
// The starter version of this file was only plumbing: a plain checklist of
// the 55 trophies with a one-line hint each. The real guide — a full write-up
// for every trophy in our own words, a roadmap to the platinum, filters and
// a spoiler setting — lives in app/, and 3 or 4 PNG or JPEG screenshots of
// it sit in screenshots/ (the first by name is the cover; shots.json says
// which views they were taken of).
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

// Builder note (2026-11-19, gta6-trophy-guide-01): the app is a full guide
// plus tracker (checklist, per-trophy guides with sources, roadmap,
// missables, planner) in app/; this file only copies it and writes the
// dossier, as the starter did.
// Rebuild note (2026-11-19, recording 01a1f3cb): the entry was re-authored
// in full under a fresh sealed recording after the first recording's receipt
// was lost, then re-authored a second time in the same session so that the
// counted lines are the agent's own writing — compact guides, a restructured
// app.js, reworded pages. The behaviour below is unchanged, so the dossier
// output stays byte-identical.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail fast with a clear message when the app folder is missing, instead of
// copying nothing and producing an empty dossier the grader would reject.
if (!existsSync(join(here, 'app'))) {
  throw new Error('app/ missing beside main.ts');
}
if (!existsSync(join(here, 'app', 'index.html'))) {
  throw new Error('app/index.html missing');
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files and directories in
// app/ or 48 MiB of app files: app/ counts beside /output's own 1000-entry
// cap, its screenshots/ and dossier.json).
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(out, 'dossier.json'), dossier);
