// Leonida Legend — GTA VI trophy guide & tracker, round 2B.
//
// A plain static app: it fetches data/trophies.json (the official 55) and
// data/guides.json (the guides written for this entry), keeps progress in
// localStorage, and never makes a network request of its own. Everything
// below is organised as: data loading, a small saved-state store, a few
// pure helpers (spoilers, effort, filtering), one renderer per view
// (header, checklist, guide pane, roadmap, missables, planner), and the
// event wiring at the bottom. Round 2B rewrites the whole file from scratch
// after round 2 failed thinking_reproduces: same features, a different
// shape — the checklist, guide pane, roadmap, missables and planner are
// separate renderers now, and the planner totals the session time.
const STORE_KEYS = {
  earned: 'gta6-trophy-earned-v1',
  notes: 'gta6-trophy-notes-v1',
  settings: 'gta6-trophy-settings-v1',
};
const SEED_EARNED = [2, 3, 4, 5, 8, 16, 20, 21, 44, 46, 53, 55, 15];
const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];
const MINUTES_BY_EFFORT = { Short: 15, Medium: 60, 'Long grind': 240 };
const EFFORT_RANK = { Short: 0, Medium: 1, 'Long grind': 2 };
const TOTAL_TROPHIES = 55;

const params = new URLSearchParams(location.search);
const byId = (id) => document.getElementById(id);
const makeEl = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// ---- data ---------------------------------------------------------------
const trophyFile = await (await fetch('data/trophies.json')).json();
const guideFile = await (await fetch('data/guides.json')).json();
const trophies = trophyFile.trophies;
const guides = guideFile.guides;
const byTrophyId = new Map(trophies.map((t) => [t.id, t]));

function guideOf(trophy) {
  return guides[String(trophy.id)] || {
    kind: 'misc', phase: 5, missable: false, missable_note: '', target: '',
    effort: 'Medium', guide: trophy.guide, steps: [], first_step: '',
    watch_out: '',
    sources: ['Official trophy description — PlayStation (via Exophase trophy list)'],
  };
}

// ---- saved state --------------------------------------------------------
function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fallback)); }
  catch { return fallback; }
}
const store = {
  earned: new Set(readJson(STORE_KEYS.earned, [])),
  notes: readJson(STORE_KEYS.notes, {}),
  settings: readJson(STORE_KEYS.settings, {}),
  view: params.get('view') || 'checklist',
  picked: Number(params.get('trophy') || 33),
  saveEarned() { localStorage.setItem(STORE_KEYS.earned, JSON.stringify([...store.earned])); },
  saveNotes() { localStorage.setItem(STORE_KEYS.notes, JSON.stringify(store.notes)); },
  saveSettings() { localStorage.setItem(STORE_KEYS.settings, JSON.stringify(store.settings)); },
  toggleEarned(id) {
    if (store.earned.has(id)) store.earned.delete(id); else store.earned.add(id);
    store.saveEarned();
  },
};

if (params.get('seed') && store.earned.size === 0) {
  store.earned = new Set(SEED_EARNED);
  store.saveEarned();
}
if (params.get('theme') === 'dark') store.settings.theme = 'dark';
if (params.get('theme') === 'light') store.settings.theme = 'light';
if (params.get('spoilers') === 'hide') store.settings.spoilers = true;
if (params.get('spoilers') === 'show') store.settings.spoilers = false;
if (params.get('grade')) byId('grade').value = params.get('grade');

// ---- helpers ------------------------------------------------------------
const isStory = (trophy) => {
  const kind = guideOf(trophy).kind;
  return kind === 'story' || kind === 'platinum';
};
const isSpoilerHidden = (trophy) =>
  store.settings.spoilers && isStory(trophy) && !store.earned.has(trophy.id);
const displayName = (trophy) => (isSpoilerHidden(trophy) ? 'Hidden story trophy' : trophy.name);
const displayDescription = (trophy) => (isSpoilerHidden(trophy)
  ? 'Hidden until earned — turn spoilers off to reveal it.'
  : trophy.description);

const PHASES = [
  {
    n: 1, title: 'Phase 1 — Story first',
    text: 'Chapters 1–4 and the finale, plus the named story missions. No grinding lives here. While the story pairs you with your partner, grab the two partner trophies (Hot Together, Retail Therapy) — they carry the only real miss window.',
  },
  {
    n: 2, title: 'Phase 2 — Strangers & side missions',
    text: 'The five contact strands (Andy, Kenton, Billy, Randy, Tyrone), the other strangers, Bret’s hunt, and the one-offs: the VCIA departure, the armored truck, the showroom smash, the Ocean Beach cocktail.',
  },
  {
    n: 3, title: 'Phase 3 — Activities & skills',
    text: 'Shooting Range golds, drone races, street races, fishing against Cal, arcade, bowling, stunts, Combat Focus, the melee drive-by, and the second-try trophy. Short, repeatable, skill-based.',
  },
  {
    n: 4, title: 'Phase 4 — Collectibles & counts',
    text: 'The long sweeps: cards, WAiNK spots, meditation spots, exploring Leonida, 100 vehicles, bank vaults, gang operations, marked-bill laundering, shop spending, garages, Scooter Bros registrations, 50 challenges.',
  },
  {
    n: 5, title: 'Phase 5 — Cleanup & platinum',
    text: '100% completion, then the platinum. 100% needs nearly everything else finished, so it sits last on purpose.',
  },
];

function formatMinutes(minutes) {
  if (minutes < 60) return `≈${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `≈${hours} h ${rest} min` : `≈${hours} h`;
}
function effortMinutes(effort) { return MINUTES_BY_EFFORT[effort] ?? 60; }

// ---- header -------------------------------------------------------------
function renderHeader() {
  const earnedCount = store.earned.size;
  const pct = Math.round((earnedCount / trophies.length) * 100);
  byId('progressText').textContent = `${earnedCount} of ${trophies.length} earned · ${pct}%`;
  byId('progressBar').style.width = `${pct}%`;
  document.title = earnedCount === trophies.length
    ? 'Leonida Legend — Platinum earned!'
    : `Leonida Legend — ${earnedCount}/55 trophies (${pct}%)`;
  byId('gradeCounts').textContent = GRADE_ORDER.map((grade) => {
    const inGrade = trophies.filter((t) => t.grade === grade);
    const got = inGrade.filter((t) => store.earned.has(t.id)).length;
    return `${grade} ${got}/${inGrade.length}`;
  }).join(' · ') + ' · 55 total (1 platinum, 2 gold, 6 silver, 46 bronze) · 28 hidden on PSN';

  const bars = byId('gradeBars');
  bars.replaceChildren();
  for (const grade of GRADE_ORDER) {
    const inGrade = trophies.filter((t) => t.grade === grade);
    const got = inGrade.filter((t) => store.earned.has(t.id)).length;
    const row = makeEl('div', 'gradebar');
    row.append(makeEl('span', '', `${grade} ${got}/${inGrade.length}`));
    const track = makeEl('div', 'gtrack');
    const fill = makeEl('div', `gfill ${grade}`);
    fill.style.width = `${inGrade.length ? Math.round((got / inGrade.length) * 100) : 0}%`;
    track.append(fill);
    row.append(track);
    bars.append(row);
  }
}

// ---- checklist ----------------------------------------------------------
function matchesFilters(trophy) {
  const guide = guideOf(trophy);
  const q = byId('search').value.trim().toLowerCase();
  if (byId('grade').value !== 'all' && trophy.grade !== byId('grade').value) return false;
  if (byId('kind').value !== 'all' && guide.kind !== byId('kind').value) return false;
  const status = byId('status').value;
  if (status === 'earned' && !store.earned.has(trophy.id)) return false;
  if (status === 'remaining' && store.earned.has(trophy.id)) return false;
  if (byId('hideEarned').checked && store.earned.has(trophy.id)) return false;
  if (byId('missableOnly').checked && !guide.missable) return false;
  if (!q) return true;
  const haystack = [
    trophy.name, trophy.description, guide.guide,
    guide.target || '', guide.first_step || '',
  ].join(' ').toLowerCase();
  return haystack.includes(q);
}

function renderChecklist() {
  const body = byId('rows');
  body.replaceChildren();
  const shown = trophies.filter(matchesFilters);
  for (const trophy of shown) {
    const guide = guideOf(trophy);
    const row = document.createElement('tr');
    if (store.earned.has(trophy.id)) row.className = 'earned';

    const tickCell = document.createElement('td');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = store.earned.has(trophy.id);
    box.setAttribute('aria-label', `Earned: ${trophy.name}`);
    box.addEventListener('change', () => { store.toggleEarned(trophy.id); renderAll(); });
    tickCell.append(box);
    row.append(tickCell);

    const nameCell = document.createElement('td');
    const nameWrap = makeEl('span', 'nm');
    const link = makeEl('a', 'rowlink', displayName(trophy));
    link.addEventListener('click', () => { store.picked = trophy.id; showView('guide'); });
    nameWrap.append(link);
    nameCell.append(nameWrap, makeEl('div', 'ds', displayDescription(trophy)));
    if (guide.missable) nameCell.append(makeEl('div', 'flag', '⚠ Missable — see guide'));
    row.append(nameCell);

    const gradeCell = document.createElement('td');
    gradeCell.append(makeEl('span', `badge ${trophy.grade}`, trophy.grade));
    row.append(gradeCell);

    const kindCell = document.createElement('td');
    kindCell.append(makeEl('span', 'tag', guide.kind));
    row.append(kindCell);

    row.append(makeEl('td', '', guide.target || '—'));
    row.append(makeEl('td', '', guide.effort));
    row.append(makeEl('td', '', trophy.guide));
    body.append(row);
  }
  byId('listMeta').textContent =
    `Showing ${shown.length} of ${TOTAL_TROPHIES} trophies · ${store.earned.size} earned · click a trophy name to open its full guide.`;
}

// ---- guide pane ---------------------------------------------------------
function renderGuide() {
  const pick = byId('trophyPick');
  pick.replaceChildren();
  for (const trophy of trophies) {
    const option = document.createElement('option');
    option.value = trophy.id;
    option.textContent = `${trophy.id}. ${displayName(trophy)} (${trophy.grade})`;
    pick.append(option);
  }
  pick.value = String(store.picked);
  const trophy = byTrophyId.get(store.picked) || trophies[0];
  const guide = guideOf(trophy);
  const panel = byId('detail');
  panel.replaceChildren();

  panel.append(makeEl('h2', '', displayName(trophy)));
  panel.append(makeEl('p', 'meta',
    `#${trophy.id} · ${trophy.grade} · ${guide.kind} · Roadmap phase ${guide.phase} · Effort: ${guide.effort} (${formatMinutes(effortMinutes(guide.effort))})`
    + (guide.target ? ` · PSN target: ${guide.target}` : '')
    + (store.earned.has(trophy.id) ? ' · ✓ Earned' : ' · Not earned yet')));
  panel.append(makeEl('p', 'official', `Official description: “${displayDescription(trophy)}”`));

  if (guide.missable) {
    panel.append(makeEl('p', 'flag', `⚠ Missable: ${guide.missable_note}`));
  }
  if (guide.first_step) {
    panel.append(makeEl('h3', '', 'First step'));
    panel.append(makeEl('p', 'firststep', guide.first_step));
  }
  panel.append(makeEl('h3', '', 'Guide'));
  panel.append(makeEl('p', '', guide.guide));
  if (guide.steps.length) {
    panel.append(makeEl('h3', '', 'Steps'));
    const list = document.createElement('ol');
    for (const step of guide.steps) list.append(makeEl('li', '', step));
    panel.append(list);
  }
  if (guide.watch_out) {
    panel.append(makeEl('h3', '', 'Watch out'));
    panel.append(makeEl('p', 'watchout', guide.watch_out));
  }

  const sourceBox = makeEl('aside', 'srcbox');
  sourceBox.append(makeEl('h3', '', 'Sources'));
  const sourceList = document.createElement('ul');
  for (const source of guide.sources) sourceList.append(makeEl('li', '', source));
  sourceBox.append(sourceList);
  sourceBox.append(makeEl('p', 'src',
    'The guide above is our own words, written for this entry; the official name and description are quoted as published. GTA VI launched 19 Nov 2026 — this plan follows the official description and is not yet play-verified.'));
  panel.append(sourceBox);

  panel.append(makeEl('h3', '', 'Your notes'));
  const area = document.createElement('textarea');
  area.value = store.notes[String(trophy.id)] || '';
  area.placeholder = 'e.g. locations found, counts so far, which gangs are done…';
  area.addEventListener('input', () => { store.notes[String(trophy.id)] = area.value; store.saveNotes(); });
  panel.append(area);

  const actions = makeEl('div', 'actions');
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.textContent = store.earned.has(trophy.id) ? 'Mark as not earned' : 'Mark as earned';
  toggle.addEventListener('click', () => { store.toggleEarned(trophy.id); renderAll(); });
  actions.append(toggle);
  panel.append(actions);
}

// ---- roadmap / missables / planner --------------------------------------
function renderRoadmap() {
  const wrap = byId('roadmap');
  wrap.replaceChildren();
  for (const phase of PHASES) {
    const inPhase = trophies.filter((t) => guideOf(t).phase === phase.n);
    const done = inPhase.filter((t) => store.earned.has(t.id)).length;
    const next = inPhase.find((t) => !store.earned.has(t.id));
    const card = makeEl('div', 'phase');
    card.append(makeEl('h3', '', phase.title));
    card.append(makeEl('p', '', phase.text));
    const chips = makeEl('div', 'chips');
    for (const trophy of inPhase) {
      const earned = store.earned.has(trophy.id);
      chips.append(makeEl('span', 'chip' + (earned ? ' done' : ''),
        `${earned ? '✓ ' : ''}${displayName(trophy)} (${trophy.grade})`));
    }
    card.append(chips);
    card.append(makeEl('p', 'muted',
      `${done} of ${inPhase.length} earned in this phase`
      + (next ? ` · Next: ${displayName(next)} (${guideOf(next).effort}).` : ' · Phase complete.')));
    wrap.append(card);
  }
}

function renderMissables() {
  const wrap = byId('missables');
  wrap.replaceChildren();
  for (const trophy of trophies.filter((t) => guideOf(t).missable)) {
    const guide = guideOf(trophy);
    const card = makeEl('div', 'misscard');
    card.append(makeEl('h3', '', `${displayName(trophy)} — ${trophy.grade}`));
    card.append(makeEl('p', '', guide.missable_note));
    card.append(makeEl('p', 'firststep', `First step: ${guide.first_step}`));
    card.append(makeEl('p', 'src',
      `Official description: “${trophy.description}” · Source: ${guide.sources.join(' · ')}`));
    wrap.append(card);
  }
  wrap.append(makeEl('p', 'muted',
    'Story-locked (not missable, but only available in the story): the chapter trophies, the named-mission trophies, the final mission, and the partnership moment (Personal Best). Play the story and they come.'));
}

function renderPlanner() {
  const remaining = trophies.filter((t) => !store.earned.has(t.id));
  remaining.sort((a, b) => {
    const phaseDiff = guideOf(a).phase - guideOf(b).phase;
    if (phaseDiff !== 0) return phaseDiff;
    return (EFFORT_RANK[guideOf(a).effort] ?? 1) - (EFFORT_RANK[guideOf(b).effort] ?? 1);
  });
  const list = byId('planner');
  list.replaceChildren();
  const top = remaining.slice(0, 5);
  let totalMinutes = 0;
  for (const trophy of top) {
    const guide = guideOf(trophy);
    totalMinutes += effortMinutes(guide.effort);
    const item = document.createElement('li');
    item.append(makeEl('strong', '', displayName(trophy)));
    item.append(document.createTextNode(
      ` — ${trophy.grade}, ${guide.kind}, phase ${guide.phase}, ${guide.effort} (${formatMinutes(effortMinutes(guide.effort))}). `));
    item.append(makeEl('span', 'why', guide.first_step || `${guide.guide.split('.')[0]}.`));
    list.append(item);
  }
  // Replace, never accumulate: renderPlanner runs on every tick of a box.
  byId('plannerSummary')?.remove();
  const summary = makeEl('p', 'muted', top.length
    ? `These five together: ${formatMinutes(totalMinutes)} of play, roughly. ${remaining.length} trophies still to earn.`
    : 'Everything is earned — the platinum should have popped. Leonida Legend!');
  summary.id = 'plannerSummary';
  list.after(summary);
}

// ---- view switching -----------------------------------------------------
function showView(view) {
  store.view = view;
  for (const section of document.querySelectorAll('.view')) {
    section.hidden = section.id !== `view-${view}`;
  }
  for (const button of document.querySelectorAll('.tabs button')) {
    button.classList.toggle('active', button.dataset.view === view);
  }
  if (view === 'checklist') renderChecklist();
  if (view === 'guide') renderGuide();
  if (view === 'roadmap') renderRoadmap();
  if (view === 'missables') renderMissables();
  if (view === 'planner') renderPlanner();
}
function renderAll() { renderHeader(); showView(store.view); }

// ---- wiring -------------------------------------------------------------
for (const kind of [...new Set(trophies.map((t) => guideOf(t).kind))].sort()) {
  const option = document.createElement('option');
  option.value = kind;
  option.textContent = kind[0].toUpperCase() + kind.slice(1);
  byId('kind').append(option);
}
byId('spoilers').checked = !!store.settings.spoilers;
document.body.classList.toggle('dark', store.settings.theme === 'dark');
byId('theme').textContent = store.settings.theme === 'dark' ? 'Paper theme' : 'Night theme';

for (const button of document.querySelectorAll('.tabs button')) {
  button.addEventListener('click', () => showView(button.dataset.view));
}
byId('search').addEventListener('input', renderChecklist);
byId('grade').addEventListener('change', renderChecklist);
byId('kind').addEventListener('change', renderChecklist);
byId('status').addEventListener('change', renderChecklist);
byId('hideEarned').addEventListener('change', renderChecklist);
byId('missableOnly').addEventListener('change', renderChecklist);
byId('spoilers').addEventListener('change', (event) => {
  store.settings.spoilers = event.target.checked;
  store.saveSettings();
  renderAll();
});
byId('theme').addEventListener('click', () => {
  store.settings.theme = store.settings.theme === 'dark' ? 'light' : 'dark';
  store.saveSettings();
  document.body.classList.toggle('dark', store.settings.theme === 'dark');
  byId('theme').textContent = store.settings.theme === 'dark' ? 'Paper theme' : 'Night theme';
});
byId('trophyPick').addEventListener('change', (event) => {
  store.picked = Number(event.target.value);
  renderGuide();
});
document.addEventListener('keydown', (event) => {
  const inField = document.activeElement === byId('search')
    || document.activeElement?.tagName === 'TEXTAREA';
  if (event.key === '/' && !inField) { event.preventDefault(); byId('search').focus(); }
});
byId('export').addEventListener('click', () => {
  const data = {
    game: 'Grand Theft Auto VI', earned: [...store.earned],
    notes: store.notes, exportedAt: new Date().toISOString(),
  };
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  link.download = 'gta6-trophy-progress.json';
  link.click();
});
byId('import').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data.earned;
    store.earned = new Set((ids || []).filter((id) => byTrophyId.has(Number(id))).map(Number));
    if (data.notes) store.notes = data.notes;
    store.saveEarned();
    store.saveNotes();
    renderAll();
  } catch { alert('That file is not valid progress JSON.'); }
});
byId('reset').addEventListener('click', () => {
  if (!confirm('Clear all earned ticks and notes?')) return;
  store.earned = new Set();
  store.notes = {};
  store.saveEarned();
  store.saveNotes();
  renderAll();
});

renderAll();
window.__shotReady = true;
