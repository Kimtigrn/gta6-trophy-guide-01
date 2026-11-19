// Leonida Legend — GTA VI trophy guide & tracker (written for this entry).
// Static, offline, no network: loads data/trophies.json (official list) and
// data/guides.json (guides written for this entry), saves progress in localStorage.
const EARNED_KEY = 'gta6-trophy-earned-v1';
const NOTES_KEY = 'gta6-trophy-notes-v1';
const SETTINGS_KEY = 'gta6-trophy-settings-v1';
const SEED_IDS = [2, 3, 4, 5, 8, 16, 20, 21, 44, 46, 53, 55, 15];
const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);

const trophiesDoc = await (await fetch('data/trophies.json')).json();
const guidesDoc = await (await fetch('data/guides.json')).json();
const trophies = trophiesDoc.trophies;
const guides = guidesDoc.guides;
const byId = new Map(trophies.map((t) => [t.id, t]));
const guideOf = (t) => guides[String(t.id)] || { kind: 'misc', phase: 5, missable: false, missable_note: '', target: '', effort: 'Medium', guide: t.guide, steps: [], sources: ['Official trophy description — PlayStation (via Exophase trophy list)'] };

let earned = new Set(JSON.parse(localStorage.getItem(EARNED_KEY) ?? '[]'));
let notes = JSON.parse(localStorage.getItem(NOTES_KEY) ?? '{}');
let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
if (params.get('seed') && earned.size === 0) {
  earned = new Set(SEED_IDS);
  saveEarned();
}
if (params.get('theme') === 'dark') settings.theme = 'dark';
if (params.get('theme') === 'light') settings.theme = 'light';
if (params.get('spoilers') === 'hide') settings.spoilers = true;
if (params.get('spoilers') === 'show') settings.spoilers = false;
if (params.get('grade')) $('grade').value = params.get('grade');

function saveEarned() { localStorage.setItem(EARNED_KEY, JSON.stringify([...earned])); }
function saveNotes() { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); }
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
function isStory(t) { return guideOf(t).kind === 'story' || guideOf(t).kind === 'platinum'; }
function hiddenBySpoiler(t) { return settings.spoilers && isStory(t) && !earned.has(t.id); }
function displayName(t) { return hiddenBySpoiler(t) ? 'Hidden story trophy' : t.name; }
function displayDesc(t) { return hiddenBySpoiler(t) ? 'Hidden until earned — turn spoilers off to reveal it.' : t.description; }

const kinds = [...new Set(trophies.map((t) => guideOf(t).kind))].sort();
for (const k of kinds) {
  const o = document.createElement('option');
  o.value = k; o.textContent = k[0].toUpperCase() + k.slice(1);
  $('kind').append(o);
}
$('spoilers').checked = !!settings.spoilers;
document.body.classList.toggle('dark', settings.theme === 'dark');
$('theme').textContent = settings.theme === 'dark' ? 'Paper theme' : 'Night theme';

const PHASES = [
  { n: 1, title: 'Phase 1 — Story first', text: 'Play Chapters 1–4 and the finale, plus the named story missions. Nothing here needs grinding. While the story pairs you with your partner, do the two partner trophies (Hot Together, Retail Therapy) — they are the only ones with a real miss window.' },
  { n: 2, title: 'Phase 2 — Strangers & side missions', text: 'The five contact strands (Andy, Kenton, Billy, Randy, Tyrone), other strangers, Bret’s hunt, and the side one-offs: VCIA departure, armored truck, showroom smash, Ocean Beach cocktail.' },
  { n: 3, title: 'Phase 3 — Activities & skills', text: 'Shooting Range golds, drone races, street races, fishing vs Cal, arcade, bowling, stunts, Combat Focus, the melee drive-by, and the second-try trophy. Short, repeatable, skill-based.' },
  { n: 4, title: 'Phase 4 — Collectibles & counts', text: 'The long sweeps: cards, WAiNK spots, meditation spots, 52 areas, 100 vehicles, bank vaults, gang operations, marked-bill laundering, shop spending, garages, Scooter Bros registrations, 50 challenges.' },
  { n: 5, title: 'Phase 5 — Cleanup & platinum', text: 'Choices to 500, 100% completion, then the platinum. 100% needs almost everything else done, so it goes last by design.' },
];

let view = params.get('view') || 'checklist';
let pickedId = Number(params.get('trophy') || 17);

function renderHeader() {
  const total = trophies.length;
  const pct = Math.round((earned.size / total) * 100);
  $('progressText').textContent = `${earned.size} of ${total} earned · ${pct}%`;
  $('progressBar').style.width = `${pct}%`;
  const counts = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const all = trophies.filter((t) => t.grade === g).length;
    const got = trophies.filter((t) => t.grade === g && earned.has(t.id)).length;
    return `${g} ${got}/${all}`;
  }).join(' · ');
  $('gradeCounts').textContent = `${counts} · 55 total (1 platinum, 2 gold, 6 silver, 46 bronze) · 28 hidden on PSN`;
}

function filtered() {
  const q = $('search').value.trim().toLowerCase();
  const g = $('grade').value, k = $('kind').value, s = $('status').value;
  return trophies.filter((t) => {
    if (g !== 'all' && t.grade !== g) return false;
    if (k !== 'all' && guideOf(t).kind !== k) return false;
    if (s === 'earned' && !earned.has(t.id)) return false;
    if (s === 'remaining' && earned.has(t.id)) return false;
    if ($('hideEarned').checked && earned.has(t.id)) return false;
    if ($('missableOnly').checked && !guideOf(t).missable) return false;
    if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || guideOf(t).guide.toLowerCase().includes(q) || (guideOf(t).target || '').toLowerCase().includes(q))) return false;
    return true;
  });
}

function renderChecklist() {
  const rows = $('rows');
  rows.replaceChildren();
  const list = filtered();
  for (const t of list) {
    const gd = guideOf(t);
    const tr = document.createElement('tr');
    if (earned.has(t.id)) tr.className = 'earned';
    const box = document.createElement('input');
    box.type = 'checkbox'; box.checked = earned.has(t.id);
    box.setAttribute('aria-label', `Earned: ${t.name}`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.id); else earned.delete(t.id);
      saveEarned(); renderAll();
    });
    const c0 = document.createElement('td'); c0.append(box); tr.append(c0);
    const c1 = document.createElement('td');
    const nm = document.createElement('span'); nm.className = 'nm';
    const link = document.createElement('a'); link.className = 'rowlink'; link.textContent = displayName(t);
    link.addEventListener('click', () => { pickedId = t.id; showView('guide'); });
    nm.append(link);
    const ds = document.createElement('div'); ds.className = 'ds'; ds.textContent = displayDesc(t);
    c1.append(nm, ds);
    if (gd.missable) {
      const f = document.createElement('div'); f.className = 'flag'; f.textContent = '⚠ Missable — see guide';
      c1.append(f);
    }
    tr.append(c1);
    const c2 = document.createElement('td');
    const b = document.createElement('span'); b.className = `badge ${t.grade}`; b.textContent = t.grade;
    c2.append(b); tr.append(c2);
    const c3 = document.createElement('td');
    const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = gd.kind;
    c3.append(tag); tr.append(c3);
    const c4 = document.createElement('td'); c4.textContent = gd.target || '—'; tr.append(c4);
    const c5 = document.createElement('td'); c5.textContent = t.guide; tr.append(c5);
    rows.append(tr);
  }
  $('listMeta').textContent = `Showing ${list.length} of 55 trophies · ${earned.size} earned · click a trophy name to open its full guide.`;
}

function renderDetail() {
  const pick = $('trophyPick');
  pick.replaceChildren();
  for (const t of trophies) {
    const o = document.createElement('option');
    o.value = t.id; o.textContent = `${t.id}. ${displayName(t)} (${t.grade})`;
    pick.append(o);
  }
  pick.value = String(pickedId);
  const t = byId.get(pickedId) || trophies[0];
  const gd = guideOf(t);
  const d = $('detail');
  d.replaceChildren();
  const h = document.createElement('h2'); h.textContent = displayName(t); d.append(h);
  const meta = document.createElement('p'); meta.className = 'meta';
  meta.textContent = `#${t.id} · ${t.grade} · ${gd.kind} · Roadmap phase ${gd.phase} · Effort: ${gd.effort}${gd.target ? ` · PSN target: ${gd.target}` : ''}${earned.has(t.id) ? ' · ✓ Earned' : ' · Not earned yet'}`;
  d.append(meta);
  const off = document.createElement('p'); off.className = 'official';
  off.textContent = `Official description: “${displayDesc(t)}”`;
  d.append(off);
  if (gd.missable) {
    const warn = document.createElement('p'); warn.className = 'flag';
    warn.textContent = `⚠ Missable: ${gd.missable_note}`;
    d.append(warn);
  }
  const h3 = document.createElement('h3'); h3.textContent = 'Guide'; d.append(h3);
  const p = document.createElement('p'); p.textContent = gd.guide; d.append(p);
  if (gd.steps.length) {
    const h4 = document.createElement('h3'); h4.textContent = 'Steps'; d.append(h4);
    const ol = document.createElement('ol');
    for (const s of gd.steps) { const li = document.createElement('li'); li.textContent = s; ol.append(li); }
    d.append(ol);
  }
  const src = document.createElement('p'); src.className = 'src';
  src.textContent = `Sources: ${gd.sources.join(' · ')}. The guide above is our own words, written for this entry; the official name and description are quoted as published. GTA VI launched 19 Nov 2026 — this plan follows the official description and is not yet play-verified.`;
  d.append(src);
  const h5 = document.createElement('h3'); h5.textContent = 'Your notes'; d.append(h5);
  const ta = document.createElement('textarea');
  ta.value = notes[String(t.id)] || '';
  ta.placeholder = 'e.g. locations found, counts so far, which gangs are done…';
  ta.addEventListener('input', () => { notes[String(t.id)] = ta.value; saveNotes(); });
  d.append(ta);
  const acts = document.createElement('div'); acts.className = 'actions';
  const btn = document.createElement('button'); btn.type = 'button';
  btn.textContent = earned.has(t.id) ? 'Mark as not earned' : 'Mark as earned';
  btn.addEventListener('click', () => {
    if (earned.has(t.id)) earned.delete(t.id); else earned.add(t.id);
    saveEarned(); renderAll();
  });
  acts.append(btn); d.append(acts);
}

function renderRoadmap() {
  const wrap = $('roadmap');
  wrap.replaceChildren();
  for (const ph of PHASES) {
    const card = document.createElement('div'); card.className = 'phase';
    const h = document.createElement('h3'); h.textContent = ph.title; card.append(h);
    const p = document.createElement('p'); p.textContent = ph.text; card.append(p);
    const chips = document.createElement('div'); chips.className = 'chips';
    for (const t of trophies.filter((x) => guideOf(x).phase === ph.n)) {
      const c = document.createElement('span');
      c.className = 'chip' + (earned.has(t.id) ? ' done' : '');
      c.textContent = `${earned.has(t.id) ? '✓ ' : ''}${displayName(t)} (${t.grade})`;
      chips.append(c);
    }
    card.append(chips);
    const done = trophies.filter((x) => guideOf(x).phase === ph.n && earned.has(x.id)).length;
    const total = trophies.filter((x) => guideOf(x).phase === ph.n).length;
    const m = document.createElement('p'); m.className = 'muted'; m.textContent = `${done} of ${total} earned in this phase.`;
    card.append(m);
    wrap.append(card);
  }
}

function renderMissables() {
  const wrap = $('missables');
  wrap.replaceChildren();
  const list = trophies.filter((t) => guideOf(t).missable);
  for (const t of list) {
    const gd = guideOf(t);
    const card = document.createElement('div'); card.className = 'misscard';
    const h = document.createElement('h3'); h.textContent = `${displayName(t)} — ${t.grade}`; card.append(h);
    const p = document.createElement('p'); p.textContent = gd.missable_note; card.append(p);
    const s = document.createElement('p'); s.className = 'src';
    s.textContent = `Official description: “${t.description}” · Source: ${gd.sources.join(' · ')}`;
    card.append(s);
    wrap.append(card);
  }
  const note = document.createElement('p');
  note.className = 'muted';
  note.textContent = 'Story-locked (not missable, but only available in the story): the chapter trophies, the named-mission trophies, the final mission, and the partnership moment (Personal Best). Play the story and they come.';
  wrap.append(note);
}

function renderPlanner() {
  const effortRank = { Short: 0, Medium: 1, 'Long grind': 2 };
  const remaining = trophies.filter((t) => !earned.has(t.id));
  remaining.sort((a, b) => {
    const pa = guideOf(a).phase, pb = guideOf(b).phase;
    if (pa !== pb) return pa - pb;
    return (effortRank[guideOf(a).effort] ?? 1) - (effortRank[guideOf(b).effort] ?? 1);
  });
  const list = $('planner');
  list.replaceChildren();
  for (const t of remaining.slice(0, 5)) {
    const gd = guideOf(t);
    const li = document.createElement('li');
    const b = document.createElement('strong'); b.textContent = displayName(t);
    li.append(b, ` — ${t.grade}, ${gd.kind}, phase ${gd.phase}, ${gd.effort}. `);
    const why = document.createElement('span'); why.className = 'why';
    why.textContent = gd.guide.split('.')[0] + '.';
    li.append(why);
    list.append(li);
  }
  if (!remaining.length) {
    const li = document.createElement('li'); li.textContent = 'Everything is earned — the platinum should have popped. Leonida Legend!';
    list.append(li);
  }
}

function showView(v) {
  view = v;
  for (const sec of document.querySelectorAll('.view')) sec.hidden = sec.id !== `view-${v}`;
  for (const b of document.querySelectorAll('.tabs button')) b.classList.toggle('active', b.dataset.view === v);
  if (v === 'checklist') renderChecklist();
  if (v === 'guide') renderDetail();
  if (v === 'roadmap') renderRoadmap();
  if (v === 'missables') renderMissables();
  if (v === 'planner') renderPlanner();
}

function renderAll() {
  renderHeader();
  showView(view);
}

for (const b of document.querySelectorAll('.tabs button')) {
  b.addEventListener('click', () => showView(b.dataset.view));
}
$('search').addEventListener('input', renderChecklist);
$('grade').addEventListener('change', renderChecklist);
$('kind').addEventListener('change', renderChecklist);
$('status').addEventListener('change', renderChecklist);
$('hideEarned').addEventListener('change', renderChecklist);
$('missableOnly').addEventListener('change', renderChecklist);
$('spoilers').addEventListener('change', (e) => { settings.spoilers = e.target.checked; saveSettings(); renderAll(); });
$('theme').addEventListener('click', () => {
  settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
  saveSettings();
  document.body.classList.toggle('dark', settings.theme === 'dark');
  $('theme').textContent = settings.theme === 'dark' ? 'Paper theme' : 'Night theme';
});
$('trophyPick').addEventListener('change', (e) => { pickedId = Number(e.target.value); renderDetail(); });
$('export').addEventListener('click', () => {
  const data = { game: 'Grand Theft Auto VI', earned: [...earned], notes, exportedAt: new Date().toISOString() };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
});
$('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data.earned;
    earned = new Set((ids || []).filter((id) => byId.has(Number(id))).map(Number));
    if (data.notes) notes = data.notes;
    saveEarned(); saveNotes(); renderAll();
  } catch { alert('That file is not valid progress JSON.'); }
});
$('reset').addEventListener('click', () => {
  if (!confirm('Clear all earned ticks and notes?')) return;
  earned = new Set(); notes = {};
  saveEarned(); saveNotes(); renderAll();
});

renderAll();
window.__shotReady = true;
