// Leonida Legend — offline GTA VI trophy guide and tracker.
// Loads the official list (data/trophies.json) and this entry's own guide
// text (data/guides.json), then renders the planner, the roadmap, the
// missable warnings and the checklist. Progress lives in localStorage only.
// No network use: every file comes from app/ itself.
(() => {
  'use strict';

  const SAVE_KEY = 'leonida-legend-v3';
  const NOTE_KEY = 'leonida-legend-v3-notes';
  const THEME_KEY = 'leonida-legend-v3-theme';
  const TOTAL = 55;

  // Roadmap phases, in the order to play them. The blurbs are this guide's
  // own words; the ids come from data/guides.json.
  const PHASES = [
    { id: 'story', label: 'Story', blurb: 'Play the chapters and the named story missions in order. Nothing here can be missed — each trophy pops when its mission or chapter ends.' },
    { id: 'strangers', label: 'Strangers', blurb: 'Stranger strands are chains: the final mission only appears after the earlier ones in the strand are done. Finish each chain you start.' },
    { id: 'activities', label: 'Activities', blurb: 'Races, ranges, fishing, arcade, meditation, hunting and the rest. The PSN counters track these, so chip away at them between missions.' },
    { id: 'collectibles', label: 'Collectibles', blurb: 'Cards, WAiNK spots, vehicles and all 52 areas of Leonida. Sweep the map region by region instead of hunting one item at a time.' },
    { id: 'cleanup', label: 'Cleanup', blurb: 'Money and the final grind: launder the marked bills, spend in the shops, buy the garages, register the cars, then push completion to 100%.' },
    { id: 'anytime', label: 'Anytime', blurb: 'Moments that can happen whenever you are out in the world — a failed first try, a strange sight. Keep your eyes open and do not reload past them.' },
  ];
  const PHASE_LABEL = Object.fromEntries(PHASES.map((p) => [p.id, p.label]));
  const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];
  const KIND_WORDS = {
    story: 'Story', meta: 'Platinum', activity: 'Activity', challenge: 'Challenge',
    exploration: 'Exploration', collectible: 'Collectible', combat: 'Combat',
    choice: 'Choice', partner: 'Partner', secret: 'Secret',
  };

  let trophies = [];
  let byId = new Map();
  let guideById = new Map();
  let sourceList = [];
  let earned = new Set();
  const ui = { phase: 'all', grade: 'all', q: '', hideSpoilers: true, earnedOnly: false };

  const query = new URLSearchParams(window.location.search);
  const shot = query.get('shot') || 'checklist';
  const focus = Number.parseInt(query.get('focus') || '33', 10);
  const seed = Number.parseInt(query.get('seed') || '', 10);

  const $ = (id) => document.getElementById(id);

  function loadSave() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      const ids = Array.isArray(data) ? data : data.earned;
      (ids || []).forEach((id) => earned.add(Number(id)));
    } catch { /* a corrupt save just starts empty */ }
  }

  function persist() {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({
        earned: [...earned].sort((a, b) => a - b),
      }));
    } catch { /* private mode: progress simply does not persist */ }
  }

  function seedProgress() {
    if (!Number.isInteger(seed) || seed <= 0) return;
    earned = new Set();
    // The platinum can only pop after the other 54, so never seed it earned.
    trophies
      .filter((t) => t.grade !== 'platinum')
      .slice(0, Math.min(seed, trophies.length - 1))
      .forEach((t) => earned.add(t.id));
  }

  function tallies(grade) {
    const all = trophies.filter((t) => t.grade === grade).length;
    const done = trophies.filter((t) => t.grade === grade && earned.has(t.id)).length;
    return { all, done };
  }

  function planQueue() {
    // Roadmap order: phase order first, then trophy id inside the phase.
    const order = [];
    for (const p of PHASES) {
      trophies
        .filter((t) => (guideById.get(t.id)?.phase || 'activities') === p.id)
        .sort((a, b) => a.id - b.id)
        .forEach((t) => order.push(t));
    }
    return order.filter((t) => !earned.has(t.id)).slice(0, 5);
  }

  function paintMeter() {
    const done = earned.size;
    const pct = Math.round((done / TOTAL) * 100);
    $('bar').style.width = pct + '%';
    $('pct').textContent = done + ' of ' + TOTAL + ' trophies earned — ' + pct + '% to the platinum';
    $('counts').textContent = GRADE_ORDER
      .map((g) => { const t = tallies(g); return t.done + '/' + t.all + ' ' + g; })
      .join(' · ');
    const bars = $('gradebars');
    bars.innerHTML = '';
    for (const g of GRADE_ORDER) {
      const t = tallies(g);
      const row = document.createElement('div');
      row.className = 'gradebar';
      const name = document.createElement('span');
      name.textContent = g[0].toUpperCase() + g.slice(1);
      const track = document.createElement('div');
      track.className = 'track';
      const fill = document.createElement('div');
      fill.className = 'fill';
      fill.style.width = (t.all ? Math.round((t.done / t.all) * 100) : 0) + '%';
      track.appendChild(fill);
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = t.done + '/' + t.all;
      row.append(name, track, num);
      bars.appendChild(row);
    }
  }

  function paintQueue() {
    const next = planQueue();
    const list = $('queue');
    list.innerHTML = '';
    $('queue-done').hidden = next.length !== 0;
    next.forEach((t) => {
      const g = guideById.get(t.id) || {};
      const li = document.createElement('li');
      const head = document.createElement('span');
      head.className = 'qid';
      head.textContent = '#' + t.id + ' — ' + t.name;
      const why = document.createElement('span');
      why.className = 'qwhy';
      why.textContent = ' (' + (PHASE_LABEL[g.phase] || 'Activities') + ') ' + (g.first_step || t.guide || '');
      li.append(head, why);
      list.appendChild(li);
    });
  }

  function paintStages() {
    const wrap = $('stage-list');
    wrap.innerHTML = '';
    PHASES.forEach((p, i) => {
      const members = trophies.filter((t) => (guideById.get(t.id)?.phase || 'activities') === p.id);
      if (!members.length) return;
      const box = document.createElement('div');
      box.className = 'stage';
      const h = document.createElement('h3');
      const no = document.createElement('span');
      no.className = 'phase-no';
      no.textContent = 'Phase ' + (i + 1);
      h.append(no, document.createTextNode(p.label));
      box.appendChild(h);
      const blurb = document.createElement('p');
      blurb.textContent = p.blurb;
      box.appendChild(blurb);
      const chips = document.createElement('ul');
      chips.className = 'chips';
      members.forEach((t) => {
        const chip = document.createElement('li');
        if (earned.has(t.id)) chip.className = 'done';
        chip.textContent = '#' + t.id + ' ' + t.name;
        chips.appendChild(chip);
      });
      box.appendChild(chips);
      wrap.appendChild(box);
    });
  }

  function paintRisk() {
    const wrap = $('risk-list');
    wrap.innerHTML = '';
    trophies
      .filter((t) => guideById.get(t.id)?.missable)
      .forEach((t) => {
        const g = guideById.get(t.id);
        const card = document.createElement('article');
        card.className = 'risk-card';
        const h = document.createElement('h3');
        h.textContent = '#' + t.id + ' — ' + t.name + ' (' + t.grade + ')';
        card.appendChild(h);
        const off = document.createElement('p');
        off.textContent = 'Official: ' + t.description;
        card.appendChild(off);
        const step = document.createElement('p');
        step.textContent = g.first_step;
        card.appendChild(step);
        const warn = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = 'Why it can be missed: ';
        warn.append(strong, document.createTextNode(g.watch_out));
        card.appendChild(warn);
        wrap.appendChild(card);
      });
  }

  function spoilerHidden(t) {
    const g = guideById.get(t.id);
    return ui.hideSpoilers && g && g.kind === 'story' && !earned.has(t.id) && t.id !== 1;
  }

  function visible(t) {
    const g = guideById.get(t.id) || {};
    if (ui.earnedOnly && !earned.has(t.id)) return false;
    if (ui.grade !== 'all' && t.grade !== ui.grade) return false;
    if (ui.phase === 'missable' && !g.missable) return false;
    if (ui.phase !== 'all' && ui.phase !== 'missable' && g.phase !== ui.phase) return false;
    if (ui.q) {
      const hay = (t.name + ' ' + t.description + ' ' + (g.first_step || '')).toLowerCase();
      if (!hay.includes(ui.q)) return false;
    }
    return true;
  }

  function make(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function paintCards() {
    const wrap = $('cards');
    wrap.innerHTML = '';
    let shown = 0;
    // Group by roadmap phase, in phase order — not by trophy id, whose
    // phases interleave (the platinum is id 1 but belongs to cleanup).
    for (const p of PHASES) {
      const members = trophies.filter((t) => (guideById.get(t.id)?.phase || 'activities') === p.id && visible(t));
      if (!members.length) continue;
      shown += members.length;
      const head = make('h3', 'phase-head', p.label + ' — phase ' + (PHASES.findIndex((x) => x.id === p.id) + 1));
      wrap.appendChild(head);
      for (const t of members) {
      const g = guideById.get(t.id) || {};
      const phase = g.phase || 'activities';
      const card = make('article', 'tcard' + (earned.has(t.id) ? ' earned' : ''));
      card.id = 'trophy-' + t.id;
      card.dataset.trophyId = String(t.id);

      const top = make('div', 'tcard-top');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = earned.has(t.id);
      box.setAttribute('aria-label', 'Mark trophy ' + t.id + ' as earned');
      box.addEventListener('change', () => {
        if (box.checked) earned.add(t.id); else earned.delete(t.id);
        persist();
        paintMeter();
        paintQueue();
        paintStages();
        paintCards();
      });
      top.appendChild(box);

      const titleWrap = make('div');
      const hidden = spoilerHidden(t);
      titleWrap.appendChild(make('h3', null, '#' + t.id + ' — ' + (hidden ? 'Hidden story trophy' : t.name)));
      titleWrap.appendChild(make('p', 'desc', hidden ? 'Hidden until earned (spoiler setting on).' : 'Official: ' + t.description));
      top.appendChild(titleWrap);
      top.appendChild(make('span', 'pill-grade ' + t.grade, t.grade));
      card.appendChild(top);

      const tags = make('div', 'chips');
      tags.appendChild(make('span', 'chip', KIND_WORDS[g.kind] || g.kind || '—'));
      tags.appendChild(make('span', 'chip', 'Phase ' + (PHASE_LABEL[phase] || 'Activities')));
      if (g.missable) tags.appendChild(make('span', 'chip risk', 'MISSABLE'));
      tags.appendChild(make('span', 'chip', 'PS5 · ' + t.grade));
      card.appendChild(tags);

      const guideBox = make('div', 'guide');
      guideBox.appendChild(make('h4', null, 'Guide'));
      const step = make('p');
      step.append(make('span', 'k', 'First step: '), document.createTextNode(g.first_step || t.guide || ''));
      guideBox.appendChild(step);
      const watch = make('p');
      watch.append(make('span', 'k', 'Watch out: '), document.createTextNode(g.watch_out || ''));
      guideBox.appendChild(watch);
      if (g.missable_note) {
        const note = make('p');
        note.append(make('span', 'k', 'Missable note: '), document.createTextNode(g.missable_note));
        guideBox.appendChild(note);
      }
      const srcLine = make('p', 'srcs', 'Sources: ');
      (g.sources || ['Exophase']).forEach((sid, i) => {
        const s = sourceList.find((x) => x.id === sid);
        if (i > 0) srcLine.appendChild(document.createTextNode(' · '));
        if (s) {
          const a = document.createElement('a');
          a.href = s.url;
          a.target = '_blank';
          a.rel = 'noopener';
          a.textContent = s.label;
          srcLine.appendChild(a);
        } else {
          srcLine.appendChild(document.createTextNode(sid));
        }
      });
      guideBox.appendChild(srcLine);
      card.appendChild(guideBox);
      wrap.appendChild(card);
      }
    }
    $('shown').textContent = shown + ' of ' + TOTAL + ' trophies shown';
    $('empty').hidden = shown !== 0;
  }

  function paintRefs() {
    const list = $('refs-list');
    list.innerHTML = '';
    sourceList.forEach((s) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = s.label;
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  function paintAll() {
    paintMeter();
    paintQueue();
    paintStages();
    paintRisk();
    paintCards();
    paintRefs();
  }

  function wireControls() {
    $('q').addEventListener('input', (e) => {
      ui.q = e.target.value.trim().toLowerCase();
      paintCards();
    });
    const pills = $('phase-pills');
    const allPill = document.createElement('button');
    allPill.type = 'button';
    allPill.className = 'pill on';
    allPill.dataset.phase = 'all';
    allPill.textContent = 'All phases';
    pills.appendChild(allPill);
    for (const p of PHASES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pill';
      b.dataset.phase = p.id;
      b.textContent = p.label;
      pills.appendChild(b);
    }
    const missPill = document.createElement('button');
    missPill.type = 'button';
    missPill.className = 'pill';
    missPill.dataset.phase = 'missable';
    missPill.textContent = 'Missable';
    pills.appendChild(missPill);
    pills.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      pills.querySelectorAll('.pill').forEach((x) => x.classList.remove('on'));
      btn.classList.add('on');
      ui.phase = btn.dataset.phase;
      paintCards();
    });
    $('grade').addEventListener('change', (e) => {
      ui.grade = e.target.value;
      paintCards();
    });
    $('hide-spoilers').addEventListener('change', (e) => {
      ui.hideSpoilers = e.target.checked;
      paintCards();
    });
    $('only-earned').addEventListener('change', (e) => {
      ui.earnedOnly = e.target.checked;
      paintCards();
    });
    $('dl').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify({
        earned: [...earned].sort((a, b) => a - b),
        exported_at: new Date().toISOString(),
      }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'gta6-trophy-progress.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    $('ul').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          const ids = Array.isArray(data) ? data : data.earned;
          if (!Array.isArray(ids)) throw new Error('no earned list');
          earned = new Set(ids.map(Number).filter((id) => byId.has(id)));
          persist();
          paintAll();
        } catch {
          window.alert('That file is not a trophy-progress export.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
    $('wipe').addEventListener('click', () => {
      if (!window.confirm('Clear all earned trophies?')) return;
      earned = new Set();
      persist();
      paintAll();
    });
    const pad = $('pad');
    try { pad.value = window.localStorage.getItem(NOTE_KEY) || ''; } catch { /* ignore */ }
    pad.addEventListener('input', () => {
      try { window.localStorage.setItem(NOTE_KEY, pad.value); } catch { /* ignore */ }
    });
    const themeBtn = $('theme');
    const applyTheme = (name) => {
      document.documentElement.dataset.theme = name;
      themeBtn.textContent = name === 'night' ? 'Paper theme' : 'Night theme';
      try { window.localStorage.setItem(THEME_KEY, name); } catch { /* ignore */ }
    };
    let savedTheme = 'paper';
    try { savedTheme = window.localStorage.getItem(THEME_KEY) || 'paper'; } catch { /* ignore */ }
    applyTheme(savedTheme === 'night' ? 'night' : 'paper');
    themeBtn.addEventListener('click', () => {
      applyTheme(document.documentElement.dataset.theme === 'night' ? 'paper' : 'night');
    });
  }

  function jumpToShot() {
    let target = null;
    if (shot === 'roadmap') target = $('stages');
    else if (shot === 'missables') target = $('risk');
    else if (shot === 'guide') target = $('trophy-' + focus) || $('board');
    else target = $('board');
    if (target) {
      if (shot === 'guide') target.classList.add('flash');
      target.scrollIntoView({ block: 'start' });
    }
    window.__shotReady = true;
  }

  function start() {
    loadSave();
    wireControls();
    Promise.all([
      fetch('data/trophies.json').then((r) => r.json()),
      fetch('data/guides.json').then((r) => r.json()),
    ]).then(([raw, guides]) => {
      const list = Array.isArray(raw) ? raw : raw.trophies;
      trophies = list.slice().sort((a, b) => a.id - b.id);
      trophies.forEach((t) => byId.set(t.id, t));
      (guides.guides || []).forEach((g) => guideById.set(g.id, g));
      sourceList = guides.sources || [];
      seedProgress();
      paintAll();
      setTimeout(jumpToShot, 60);
    }).catch(() => {
      $('pct').textContent = 'Could not load the trophy data. Serve app/ over HTTP (for example: node serve.ts) and reload.';
      window.__shotReady = true;
    });
  }

  document.addEventListener('DOMContentLoaded', start);
})();
