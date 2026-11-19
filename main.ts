// Leonida Trophy Atlas — entry program (Node 22, no dependencies).
//
// Copies the static guide (app/) and its screenshots (screenshots/) from this
// repository into the output directory, then writes /output/dossier.json with
// buildDossier from the kit's vendored library, so the scorer can rebuild the
// same dossier byte for byte. Outside the grader, MAKEFUN_OUTPUT_DIR stands
// in for /output.
import { buildDossier } from './vendor/makefun-frontend.ts';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Caps from the competition's own gate: text at most 163,840 bytes, 3-4
// screenshots of at most 256 KiB each, app/ at most 993 files and 48 MiB.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
} as const;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

function copyTree(name: string): void {
  const src = join(repoRoot, name);
  const dst = join(outDir, name);
  if (!existsSync(src)) throw new Error(`main.ts: missing ${name}/ in the repository`);
  rmSync(dst, { recursive: true, force: true });
  cpSync(src, dst, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyTree('app');
copyTree('screenshots');

const dossier = buildDossier(outDir, {
  text_max_bytes: DOSSIER_CAPS.text_max_bytes,
  screenshots: DOSSIER_CAPS.screenshots,
  app_max_files: DOSSIER_CAPS.app_max_files,
  app_max_bytes: DOSSIER_CAPS.app_max_bytes,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`main.ts: wrote ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
