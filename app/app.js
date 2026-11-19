// Leonida Legend — GTA VI trophy guide & tracker, round 2.
// Static app: fetches data/trophies.json (the official 55) and
// data/guides.json (guides written for this entry), saves progress in
// localStorage, never touches the network. Round 2 adds per-grade progress
// bars, a planner that estimates the time each next trophy takes, and a
// guide pane that shows a concrete first step and a watch-out line beside
// the sources for every trophy.
const STORE = {
  earned: 'gta6-trophy-earned-v1',
  notes: 'gta6-trophy-notes-v1',
  settings: 'gta6-trophy-settings-v1',
};
const SEED_IDS = [2, 3, 4, 5, 8, 16, 20, 21, 44, 46, 53, 55, 15];
const query = new URLSearchParams(location.search);
const el = (id) => document.getElementById(id);

// Rough time cost per trophy, for the planner only — minutes, not a promise.
const EFFORT_MINUTES = { Short: 15, Medium: 60, 'Long grind': 240 };
const EFFORT_ORDER = { Short: 0, Medium: 1, 'Long grind': 2 };
const GRADES = ['platinum', 'gold', 'silver', 'bronze'];

const trophyDoc = await (await fetch('data/trophies.json')).json();
const guideDoc = await (await fetch('data/guides.json')).json();
const allTrophies = trophyDoc.trophies;
const guideBook = guideDoc.guides;
const lookup = new Map(allTrophies.map((t) => [t.id, t]));
const guideFor = (t) => guideBook[String(t.id)] || {
  kind: 'misc', phase: 5, missable: false, missable_note: '', target: '',
  effort: 'Medium', guide: t.guide, steps: [], first_step: '', watch_out: '',
  sources: ['Official trophy description — PlayStation (via Exophase trophy list)'],
};

const state = {
  earned: new Set(JSON.parse(localStorage.getItem(STORE.earned) ?? '[]')),
  notes: JSON.parse(localStorage.getItem(STORE.notes) ?? '{}'),
  settings: JSON.parse(localStorage.getItem(STORE.settings) ?? '{}'),
  view: query.get('view') || 'checklist',
  picked: Number(query.get('trophy') || 33),
};

const persist = {
  earned() { localStorage.setItem(STORE.earned, JSON.stringify([...state.earned])); },
  notes() { localStorage.setItem(STORE.notes, JSON.stringify(state.notes)); },
  settings() { localStorage.setItem(STORE.settings, JSON.stringify(state.settings)); },
};

if (query.get('seed') && state.earned.size === 0) {
  state.earned = new Set(SEED_IDS);
  persist.earned();
}
if (query.get('theme') === 'dark') state.settings.theme = 'dark';
if (query.get('theme') === 'light') state.settings.theme = 'light';
if (query.get('spoilers') === 'hide') state.settings.spoilers = true;
if (query.get('spoilers') === 'show') state.settings.spoilers = false;
if (query.get('grade')) el('grade').value = query.get('grade');

const storyLike = (t) => guideFor(t).kind === 'story' || guideFor(t).kind === 'platinum';
const spoilerHidden = (t) => state.settings.spoilers && storyLike(t) && !state.earned.has(t.id);
const shownName = (t) => spoilerHidden(t) ? 'Hidden story trophy' : t.name;
const shownDesc = (t) => spoilerHidden(t)
  ? 'Hidden until earned — turn spoilers off to reveal it.'
  : t.description;

const PHASES = [
  { n: 1, title: 'Phase 1 — Story first', text: 'Chapters 1–4 and the finale, plus the named story missions. No grinding lives here. While the story pairs you with your partner, grab the two partner trophies (Hot Together, Retail Therapy) — they carry the only real miss window.' },
  { n: 2, title: 'Phase 2 — Strangers & side missions', text: 'The five contact strands (Andy, Kenton, Billy, Randy, Tyrone), the other strangers, Bret’s hunt, and the one-offs: the VCIA departure, the armored truck, the showroom smash, the Ocean Beach cocktail.' },
  { n: 3, title: 'Phase 3 — Activities & skills', text: 'Shooting Range golds, drone races, street races, fishing against Cal, arcade, bowling, stunts, Combat Focus, the melee drive-by, and the second-try trophy. Short, repeatable, skill-based.' },
  { n: 4, title: 'Phase 4 — Collectibles & counts', text: 'The long sweeps: cards, WAiNK spots, meditation spots, exploring Leonida, 100 vehicles, bank vaults, gang operations, marked-bill laundering, shop spending, garages, Scooter Bros registrations, 50 challenges.' },
  { n: 5, title: 'Phase 5 — Cleanup & platinum', text: '100% completion, then the platinum. 100% needs nearly everything else finished, so it sits last on purpose.' },
];

function fmtMinutes(m) {
  if (m < 60) return `≈${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `≈${h} h ${rest} min` : `≈${h} h`;
}

function paintHeader() {
  const total = allTrophies.length;
  const pct = Math.round((state.earned.size / total) * 100);
  el('progressText').textContent = `${state.earned.size} of ${total} earned · ${pct}%`;
  el('progressBar').style.width = `${pct}%`;
  document.title = state.earned.size === total
    ? 'Leonida Legend — Platinum earned!'
    : `Leonida Legend — ${state.earned.size}/55 trophies (${pct}%)`;
  el('gradeCounts').textContent = GRADES.map((g) => {
    const all = allTrophies.filter((t) => t.grade === g).length;
    const got = allTrophies.filter((t) => t.grade === g && state.earned.has(t.id)).length;
    return `${g} ${got}/${all}`;
  }).join(' · ') + ' · 55 total (1 platinum, 2 gold, 6 silver, 46 bronze) · 28 hidden on PSN';
  // Per-grade summary bars: one thin bar per grade so the split is visible.
  const bars = el('gradeBars');
  bars.replaceChildren();
  for (const g of GRADES) {
    const all = allTrophies.filter((t) => t.grade === g);
    const got = all.filter((t) => state.earned.has(t.id)).length;
    const row = document.createElement('div');
    row.className = 'gradebar';
    const label = document.createElement('span');
    label.textContent = `${g} ${got}/${all.length}`;
    const track = document.createElement('div');
    track.className = 'gtrack';
    const fill = document.createElement('div');
    fill.className = `gfill ${g}`;
    fill.style.width = `${all.length ? Math.round((got / all.length) * 100) : 0}%`;
    track.append(fill);
    row.append(label, track);
    bars.append(row);
  }
}

function visibleList() {
  const q = el('search').value.trim().toLowerCase();
  const grade = el('grade').value;
  const kind = el('kind').value;
  const status = el('status').value;
  return allTrophies.filter((t) => {
    const gd = guideFor(t);
    if (grade !== 'all' && t.grade !== grade) return false;
    if (kind !== 'all' && gd.kind !== kind) return false;
    if (status === 'earned' && !state.earned.has(t.id)) return false;
    if (status === 'remaining' && state.earned.has(t.id)) return false;
    if (el('hideEarned').checked && state.earned.has(t.id)) return false;
    if (el('missableOnly').checked && !gd.missable) return false;
    if (!q) return true;
    return t.name.toLowerCase().includes(q)
      || t.description.toLowerCase().includes(q)
      || gd.guide.toLowerCase().includes(q)
      || (gd.target || '').toLowerCase().includes(q)
      || (gd.first_step || '').toLowerCase().includes(q);
  });
}

function paintList() {
  const rows = el('rows');
  rows.replaceChildren();
  const list = visibleList();
  for (const t of list) {
    const gd = guideFor(t);
    const tr = document.createElement('tr');
    if (state.earned.has(t.id)) tr.className = 'earned';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = state.earned.has(t.id);
    box.setAttribute('aria-label', `Earned: ${t.name}`);
    box.addEventListener('change', () => {
      if (box.checked) state.earned.add(t.id); else state.earned.delete(t.id);
      persist.earned();
      paintAll();
    });
    const tickCell = document.createElement('td');
    tickCell.append(box);
    tr.append(tickCell);
    const nameCell = document.createElement('td');
    const nameWrap = document.createElement('span');
    nameWrap.className = 'nm';
    const openLink = document.createElement('a');
    openLink.className = 'rowlink';
    openLink.textContent = shownName(t);
    openLink.addEventListener('click', () => { state.picked = t.id; show('guide'); });
    nameWrap.append(openLink);
    const descLine = document.createElement('div');
    descLine.className = 'ds';
    descLine.textContent = shownDesc(t);
    nameCell.append(nameWrap, descLine);
    if (gd.missable) {
      const warn = document.createElement('div');
      warn.className = 'flag';
      warn.textContent = '⚠ Missable — see guide';
      nameCell.append(warn);
    }
    tr.append(nameCell);
    const gradeCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge ${t.grade}`;
    badge.textContent = t.grade;
    gradeCell.append(badge);
    tr.append(gradeCell);
    const kindCell = document.createElement('td');
    const kindTag = document.createElement('span');
    kindTag.className = 'tag';
    kindTag.textContent = gd.kind;
    kindCell.append(kindTag);
    tr.append(kindCell);
    const targetCell = document.createElement('td');
    targetCell.textContent = gd.target || '—';
    tr.append(targetCell);
    const effortCell = document.createElement('td');
    effortCell.textContent = gd.effort;
    tr.append(effortCell);
    const shortCell = document.createElement('td');
    shortCell.textContent = t.guide;
    tr.append(shortCell);
    rows.append(tr);
  }
  el('listMeta').textContent = `Showing ${list.length} of 55 trophies · ${state.earned.size} earned · click a trophy name to open its full guide.`;
}

function paintGuide() {
  const pick = el('trophyPick');
  pick.replaceChildren();
  for (const t of allTrophies) {
    const option = document.createElement('option');
    option.value = t.id;
    option.textContent = `${t.id}. ${shownName(t)} (${t.grade})`;
    pick.append(option);
  }
  pick.value = String(state.picked);
  const t = lookup.get(state.picked) || allTrophies[0];
  const gd = guideFor(t);
  const panel = el('detail');
  panel.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = shownName(t);
  panel.append(heading);
  const meta = document.createElement('p');
  meta.className = 'meta';
  meta.textContent = `#${t.id} · ${t.grade} · ${gd.kind} · Roadmap phase ${gd.phase} · Effort: ${gd.effort} (${fmtMinutes(EFFORT_MINUTES[gd.effort] ?? 60)})`
    + (gd.target ? ` · PSN target: ${gd.target}` : '')
    + (state.earned.has(t.id) ? ' · ✓ Earned' : ' · Not earned yet');
  panel.append(meta);
  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = `Official description: “${shownDesc(t)}”`;
  panel.append(official);
  if (gd.missable) {
    const warn = document.createElement('p');
    warn.className = 'flag';
    warn.textContent = `⚠ Missable: ${gd.missable_note}`;
    panel.append(warn);
  }
  // First step: the one concrete action that starts this trophy.
  if (gd.first_step) {
    const firstHeading = document.createElement('h3');
    firstHeading.textContent = 'First step';
    panel.append(firstHeading);
    const first = document.createElement('p');
    first.className = 'firststep';
    first.textContent = gd.first_step;
    panel.append(first);
  }
  const guideHeading = document.createElement('h3');
  guideHeading.textContent = 'Guide';
  panel.append(guideHeading);
  const guideText = document.createElement('p');
  guideText.textContent = gd.guide;
  panel.append(guideText);
  if (gd.steps.length) {
    const stepsHeading = document.createElement('h3');
    stepsHeading.textContent = 'Steps';
    panel.append(stepsHeading);
    const list = document.createElement('ol');
    for (const s of gd.steps) {
      const item = document.createElement('li');
      item.textContent = s;
      list.append(item);
    }
    panel.append(list);
  }
  // Watch out: the mistake or trap most likely to cost a retry — or the window.
  if (gd.watch_out) {
    const watchHeading = document.createElement('h3');
    watchHeading.textContent = 'Watch out';
    panel.append(watchHeading);
    const watch = document.createElement('p');
    watch.className = 'watchout';
    watch.textContent = gd.watch_out;
    panel.append(watch);
  }
  // Sources, boxed and always visible: no claim in this guide stands unsourced.
  const sourceBox = document.createElement('aside');
  sourceBox.className = 'srcbox';
  const sourceTitle = document.createElement('h3');
  sourceTitle.textContent = 'Sources';
  sourceBox.append(sourceTitle);
  const sourceList = document.createElement('ul');
  for (const s of gd.sources) {
    const item = document.createElement('li');
    item.textContent = s;
    sourceList.append(item);
  }
  sourceBox.append(sourceList);
  const sourceNote = document.createElement('p');
  sourceNote.className = 'src';
  sourceNote.textContent = 'The guide above is our own words, written for this entry; the official name and description are quoted as published. GTA VI launched 19 Nov 2026 — this plan follows the official description and is not yet play-verified.';
  sourceBox.append(sourceNote);
  panel.append(sourceBox);
  const notesHeading = document.createElement('h3');
  notesHeading.textContent = 'Your notes';
  panel.append(notesHeading);
  const area = document.createElement('textarea');
  area.value = state.notes[String(t.id)] || '';
  area.placeholder = 'e.g. locations found, counts so far, which gangs are done…';
  area.addEventListener('input', () => { state.notes[String(t.id)] = area.value; persist.notes(); });
  panel.append(area);
  const actions = document.createElement('div');
  actions.className = 'actions';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.textContent = state.earned.has(t.id) ? 'Mark as not earned' : 'Mark as earned';
  toggle.addEventListener('click', () => {
    if (state.earned.has(t.id)) state.earned.delete(t.id); else state.earned.add(t.id);
    persist.earned();
    paintAll();
  });
  actions.append(toggle);
  panel.append(actions);
}

function paintRoadmap() {
  const wrap = el('roadmap');
  wrap.replaceChildren();
  for (const ph of PHASES) {
    const inPhase = allTrophies.filter((x) => guideFor(x).phase === ph.n);
    const done = inPhase.filter((x) => state.earned.has(x.id)).length;
    const next = inPhase.find((x) => !state.earned.has(x.id));
    const card = document.createElement('div');
    card.className = 'phase';
    const heading = document.createElement('h3');
    heading.textContent = ph.title;
    card.append(heading);
    const blurb = document.createElement('p');
    blurb.textContent = ph.text;
    card.append(blurb);
    const chips = document.createElement('div');
    chips.className = 'chips';
    for (const t of inPhase) {
      const chip = document.createElement('span');
      chip.className = 'chip' + (state.earned.has(t.id) ? ' done' : '');
      chip.textContent = `${state.earned.has(t.id) ? '✓ ' : ''}${shownName(t)} (${t.grade})`;
      chips.append(chip);
    }
    card.append(chips);
    const count = document.createElement('p');
    count.className = 'muted';
    count.textContent = `${done} of ${inPhase.length} earned in this phase`
      + (next ? ` · Next: ${shownName(next)} (${guideFor(next).effort}).` : ' · Phase complete.');
    card.append(count);
    wrap.append(card);
  }
}

function paintMissables() {
  const wrap = el('missables');
  wrap.replaceChildren();
  for (const t of allTrophies.filter((x) => guideFor(x).missable)) {
    const gd = guideFor(t);
    const card = document.createElement('div');
    card.className = 'misscard';
    const heading = document.createElement('h3');
    heading.textContent = `${shownName(t)} — ${t.grade}`;
    card.append(heading);
    const note = document.createElement('p');
    note.textContent = gd.missable_note;
    card.append(note);
    const first = document.createElement('p');
    first.className = 'firststep';
    first.textContent = `First step: ${gd.first_step}`;
    card.append(first);
    const src = document.createElement('p');
    src.className = 'src';
    src.textContent = `Official description: “${t.description}” · Source: ${gd.sources.join(' · ')}`;
    card.append(src);
    wrap.append(card);
  }
  const footnote = document.createElement('p');
  footnote.className = 'muted';
  footnote.textContent = 'Story-locked (not missable, but only available in the story): the chapter trophies, the named-mission trophies, the final mission, and the partnership moment (Personal Best). Play the story and they come.';
  wrap.append(footnote);
}

function paintPlanner() {
  // Next-up: remaining trophies ordered by roadmap phase, then by effort,
  // each with its estimated time so a session can be planned around it.
  const remaining = allTrophies.filter((t) => !state.earned.has(t.id));
  remaining.sort((a, b) => {
    const pa = guideFor(a).phase, pb = guideFor(b).phase;
    if (pa !== pb) return pa - pb;
    return (EFFORT_ORDER[guideFor(a).effort] ?? 1) - (EFFORT_ORDER[guideFor(b).effort] ?? 1);
  });
  const list = el('planner');
  list.replaceChildren();
  const top = remaining.slice(0, 5);
  let totalMinutes = 0;
  for (const t of top) {
    const gd = guideFor(t);
    totalMinutes += EFFORT_MINUTES[gd.effort] ?? 60;
    const item = document.createElement('li');
    const bold = document.createElement('strong');
    bold.textContent = shownName(t);
    item.append(bold, ` — ${t.grade}, ${gd.kind}, phase ${gd.phase}, ${gd.effort} (${fmtMinutes(EFFORT_MINUTES[gd.effort] ?? 60)}). `);
    const why = document.createElement('span');
    why.className = 'why';
    why.textContent = `${gd.first_step || gd.guide.split('.')[0] + '.'}`;
    item.append(why);
    list.append(item);
  }
  const summary = document.createElement('p');
  summary.id = 'plannerSummary';
  summary.className = 'muted';
  summary.textContent = top.length
    ? `These five together: ${fmtMinutes(totalMinutes)} of play, roughly. ${remaining.length} trophies still to earn.`
    : 'Everything is earned — the platinum should have popped. Leonida Legend!';
  // Replace, never accumulate: paintPlanner runs on every tick of a box.
  document.getElementById('plannerSummary')?.remove();
  list.after(summary);
}

function show(v) {
  state.view = v;
  for (const section of document.querySelectorAll('.view')) section.hidden = section.id !== `view-${v}`;
  for (const b of document.querySelectorAll('.tabs button')) b.classList.toggle('active', b.dataset.view === v);
  if (v === 'checklist') paintList();
  if (v === 'guide') paintGuide();
  if (v === 'roadmap') paintRoadmap();
  if (v === 'missables') paintMissables();
  if (v === 'planner') paintPlanner();
}

function paintAll() {
  paintHeader();
  show(state.view);
}

for (const k of [...new Set(allTrophies.map((t) => guideFor(t).kind))].sort()) {
  const option = document.createElement('option');
  option.value = k;
  option.textContent = k[0].toUpperCase() + k.slice(1);
  el('kind').append(option);
}
el('spoilers').checked = !!state.settings.spoilers;
document.body.classList.toggle('dark', state.settings.theme === 'dark');
el('theme').textContent = state.settings.theme === 'dark' ? 'Paper theme' : 'Night theme';

for (const b of document.querySelectorAll('.tabs button')) {
  b.addEventListener('click', () => show(b.dataset.view));
}
el('search').addEventListener('input', paintList);
el('grade').addEventListener('change', paintList);
el('kind').addEventListener('change', paintList);
el('status').addEventListener('change', paintList);
el('hideEarned').addEventListener('change', paintList);
el('missableOnly').addEventListener('change', paintList);
el('spoilers').addEventListener('change', (e) => { state.settings.spoilers = e.target.checked; persist.settings(); paintAll(); });
el('theme').addEventListener('click', () => {
  state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
  persist.settings();
  document.body.classList.toggle('dark', state.settings.theme === 'dark');
  el('theme').textContent = state.settings.theme === 'dark' ? 'Paper theme' : 'Night theme';
});
el('trophyPick').addEventListener('change', (e) => { state.picked = Number(e.target.value); paintGuide(); });
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== el('search') && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    el('search').focus();
  }
});
el('export').addEventListener('click', () => {
  const data = { game: 'Grand Theft Auto VI', earned: [...state.earned], notes: state.notes, exportedAt: new Date().toISOString() };
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  link.download = 'gta6-trophy-progress.json';
  link.click();
});
el('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data.earned;
    state.earned = new Set((ids || []).filter((id) => lookup.has(Number(id))).map(Number));
    if (data.notes) state.notes = data.notes;
    persist.earned();
    persist.notes();
    paintAll();
  } catch { alert('That file is not valid progress JSON.'); }
});
el('reset').addEventListener('click', () => {
  if (!confirm('Clear all earned ticks and notes?')) return;
  state.earned = new Set();
  state.notes = {};
  persist.earned();
  persist.notes();
  paintAll();
});

paintAll();
window.__shotReady = true;
