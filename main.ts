// Leonida Legend — entry program (Node 22, standard library only).
//
// Stages the guide for grading: mirrors the static app (app/) and the four
// screenshots (screenshots/) into the output directory, then writes
// /output/dossier.json with buildDossier from the kit's vendored library, so
// the scorer can rebuild the identical dossier from the same files.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.
import { buildDossier } from './vendor/makefun-frontend.ts';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The competition's own gate caps, as the dossier builder needs them: text
// at most 163,840 bytes, 3-4 screenshots of at most 256 KiB each, app/ at
// most 993 files and 48 MiB in total.
const TEXT_CAP = 163840;
const SHOT_CAP = { max: 4, max_bytes: 262144 };
const APP_CAP = { max_files: 993, max_bytes: 50331648 };

const here = resolve(dirname(fileURLToPath(import.meta.url)));
const target = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

function mirror(dirName: string): void {
  const from = join(here, dirName);
  const to = join(target, dirName);
  if (!existsSync(from)) {
    throw new Error(`main.ts: the repository has no ${dirName}/ to copy`);
  }
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(target, { recursive: true });
mirror('app');
mirror('screenshots');

const dossierBytes = buildDossier(target, {
  text_max_bytes: TEXT_CAP,
  screenshots: SHOT_CAP,
  app_max_files: APP_CAP.max_files,
  app_max_bytes: APP_CAP.max_bytes,
});
const dossierPath = join(target, 'dossier.json');
writeFileSync(dossierPath, dossierBytes);
console.log(`main.ts: wrote ${dossierPath} (${dossierBytes.length} bytes)`);
