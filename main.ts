// Leonida Legend — hand-in program (Node 22, standard library only).
// The guide itself is plain static files in app/ (index.html, style.css, app.js and
// the data files), plus 3–4 screenshots in screenshots/. This program copies both
// folders into the output directory and writes dossier.json — the summary the judge
// reads — with the kit's vendored library. vendor/makefun-frontend.ts is the kit's
// copy and must stay exactly as it is: the scorer rebuilds the dossier with its own
// copy and requires the two to match byte for byte.
//
// Run it the way the grader does:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// (outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output).

import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const appDir = join(rootDir, "app");
const shotDir = join(rootDir, "screenshots");

mkdirSync(outDir, { recursive: true });
cpSync(appDir, join(outDir, "app"), { recursive: true });
mkdirSync(join(outDir, "screenshots"), { recursive: true });
if (existsSync(shotDir)) cpSync(shotDir, join(outDir, "screenshots"), { recursive: true });

// Caps from the gate: at most 4 screenshots of 256 KiB each, app/ at most 993 files
// and 48 MiB, and the dossier itself at most 1.5 MiB. Anything past those limits
// makes the entry invalid, so the program refuses it here first.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outDir, "dossier.json"), dossier);
