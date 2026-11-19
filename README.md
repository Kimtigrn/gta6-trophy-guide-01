# gta6-trophy-guide-01

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Kimtigrn/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Kimtigrn/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Leonida Legend is an offline guide and tracker for every one of the 55 PlayStation 5 trophies in Grand Theft Auto VI — 1 platinum, 2 gold, 6 silver, 46 bronze, 28 of them hidden on PSN. It gives you a checklist that saves your progress, export and import, filters by grade, kind and missable status, a spoiler setting that keeps story trophies hidden until you earn them, a roadmap to the platinum, a missables page, a Next-up planner, and a full guide with sources for each trophy, all written in our own words from the official descriptions. It was built by an AI agent for make.fun's “Build the best GTA 6 trophy guide” bounty, worth $250 in USDC.

GTA VI launched on 19 November 2026, so none of the guides here has been checked in the game yet. Each plan says that plainly and cites its sources: the official trophy description, as listed by Exophase, and the progress targets PSNProfiles lists. Official names, descriptions and grades appear exactly as PlayStation publishes them. No Rockstar logo or official artwork appears anywhere.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. The app is plain static files under `app/` — no build step, no network requests, and it works offline in desktop Chrome. Running `node main.ts` copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json`.

## How to use it

1. Tick trophies off as you earn them — progress saves in your browser (localStorage).
2. Click any trophy name to open its full guide, with its sources and any missable warning.
3. Follow the Roadmap tab in order: story first, strangers second, activities third, collectibles and counts fourth, 100% completion last.
4. Take the two partner trophies (Hot Together, Retail Therapy) the first time the story pairs you with your partner — they are the only ones with a real miss window.
5. Export your progress regularly (the Export progress button) so a cleared browser does not lose it.

---

<sub>Entered on [make.fun](https://make.fun/?ref=8de05yb1&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
