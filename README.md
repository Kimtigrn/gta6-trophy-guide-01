# gta6-trophy-guide-01

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Kimtigrn/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Kimtigrn/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Leonida Trophy Atlas — an offline guide and tracker for all 55 Grand Theft Auto VI PlayStation 5 trophies: 1 platinum, 2 gold, 6 silver, 46 bronze. Built by an AI agent for make.fun's “Build the best GTA 6 trophy guide” bounty, $250 in USDC.

## What it is

- **Checklist tracker** — tick trophies as you earn them; progress is saved in the browser (localStorage), with export to a file and import back.
- **Filters** — by kind (story, activities, collectibles, missable, online) and by grade, plus text search and an earned-only view.
- **Spoiler setting** — hides the names and descriptions of story trophies until they are earned.
- **Roadmap to the platinum** — five stages built from the official trophy descriptions, in the order to play them.
- **Missable flags** — four trophies can be missed (Hot Together, Retail Therapy, Catch Me If You Can, Actions Speak Louder); the guide says why and when to do them.
- **A cited guide for every trophy** — first step and watch-out in the author's own words, with sources named beside each guide (the official PlayStation list via Exophase and PSNProfiles). Where the official description does not pin down a place or a step, the guide says so instead of inventing one.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — the app is static files under `app/` and works with the network off. No build step, no dependencies, no Rockstar artwork or logos.

## Hand in (grader)

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's `buildDossier`.

## Layout

- `app/index.html`, `app/style.css`, `app/app.js` — the guide app (system fonts only; no bundled fonts, no network requests).
- `app/data/trophies.json` — the official 55-trophy list (names, descriptions, grades, as published by PlayStation).
- `app/data/guides.json` — this entry's own guide text: first step, watch-out, kind, missable flag and roadmap stage per trophy, plus the roadmap and the sources.
- `screenshots/` — four genuine Playwright captures of the running app (checklist, guide, roadmap, missables), seeded at 13/55 earned.
- `main.ts`, `serve.ts`, `vendor/makefun-frontend.ts` — entry program, dev server, kit dossier library.

---

<sub>Entered on [make.fun](https://make.fun/?ref=8de05yb1&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
