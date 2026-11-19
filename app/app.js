// Leonida Trophy Atlas — offline GTA VI trophy guide and tracker.
// Loads the official trophy list (app/data/trophies.json) and this entry's own
// guide text (app/data/guides.json), renders the checklist, the roadmap and
// the missable flags, and saves progress in localStorage. No network use.
(function () {
  'use strict';

  var STORE_KEY = 'leonida-trophy-atlas-v1';
  var TOTAL = 55;
  var KIND_LABELS = {
    story: 'Story',
    activities: 'Activities',
    collectibles: 'Collectibles',
    missable: 'Missable',
    online: 'Online',
    platinum: 'Platinum'
  };
  var GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];

  var trophies = [];
  var byId = {};
  var guideById = {};
  var roadmap = [];
  var sources = [];
  var earned = new Set();
  var state = { kind: 'all', grade: 'all', query: '', spoiler: true, earnedOnly: false };

  var params = new URLSearchParams(window.location.search);
  var shot = params.get('shot') || 'checklist';
  var focusId = parseInt(params.get('focus') || '33', 10);
  var seedCount = parseInt(params.get('seed') || '', 10);

  function $(id) { return document.getElementById(id); }

  function loadStored() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      var ids = Array.isArray(data) ? data : data.earned;
      (ids || []).forEach(function (id) { earned.add(Number(id)); });
    } catch (err) { /* corrupt save: start empty rather than crash */ }
  }

  function saveStored() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ earned: Array.from(earned).sort(function (a, b) { return a - b; }) }));
    } catch (err) { /* private mode: progress just does not persist */ }
  }

  function applySeed() {
    if (!Number.isInteger(seedCount) || seedCount <= 0) return;
    earned = new Set();
    // Seed the first N non-platinum trophies: the platinum itself can only
    // pop after all 54 others, so seeding it earned at 13/55 would be a lie.
    trophies.filter(function (t) { return t.grade !== 'platinum'; })
      .slice(0, Math.min(seedCount, trophies.length - 1))
      .forEach(function (t) { earned.add(t.id); });
  }

  function gradeCount(grade) {
    return trophies.filter(function (t) { return t.grade === grade; }).length;
  }

  function gradeEarned(grade) {
    return trophies.filter(function (t) { return t.grade === grade && earned.has(t.id); }).length;
  }

  function nextUp() {
    var ordered = [];
    roadmap.forEach(function (stage) {
      stage.ids.forEach(function (id) { ordered.push(id); });
    });
    for (var i = 0; i < ordered.length; i++) {
      if (!earned.has(ordered[i])) return byId[ordered[i]];
    }
    return null;
  }

  function updateProgress() {
    var done = earned.size;
    var pct = Math.round((done / TOTAL) * 100);
    $('progress-fill').style.width = pct + '%';
    $('progress-text').textContent = done + ' of ' + TOTAL + ' trophies earned — ' + pct + '% to the platinum';
    var parts = GRADE_ORDER.map(function (g) {
      return gradeEarned(g) + '/' + gradeCount(g) + ' ' + g;
    });
    $('grade-text').textContent = parts.join(' · ');
    var nxt = nextUp();
    $('next-text').textContent = nxt
      ? 'Next up: #' + nxt.id + ' ' + nxt.name + ' (stage ' + (guideById[nxt.id] ? guideById[nxt.id].stage : '?') + ' of the roadmap)'
      : 'Platinum complete — every trophy is yours.';
  }

  function isHiddenStory(t) {
    var g = guideById[t.id];
    return state.spoiler && g && g.kind === 'story' && !earned.has(t.id) && t.id !== 1;
  }

  function matchesFilters(t) {
    var g = guideById[t.id] || {};
    if (state.earnedOnly && !earned.has(t.id)) return false;
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (state.kind === 'missable' && !g.missable) return false;
    if (state.kind === 'online') return false; // the official list has no online trophies
    if (state.kind !== 'all' && state.kind !== 'missable' && state.kind !== 'online' && g.kind !== state.kind) return false;
    if (state.query) {
      var hay = (t.name + ' ' + t.description + ' ' + (g.first_step || '')).toLowerCase();
      if (hay.indexOf(state.query) === -1) return false;
    }
    return true;
  }

  function sourceLabel(id) {
    for (var i = 0; i < sources.length; i++) {
      if (sources[i].id === id) return sources[i];
    }
    return null;
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function renderRoadmap() {
    var list = $('roadmap-list');
    list.innerHTML = '';
    roadmap.forEach(function (stage) {
      var li = el('li');
      var h = el('h3');
      h.appendChild(el('span', 'stage-no', 'Stage ' + stage.stage));
      h.appendChild(document.createTextNode(stage.title));
      li.appendChild(h);
      li.appendChild(el('p', null, stage.blurb));
      var chips = el('ul', 'chips');
      stage.ids.forEach(function (id) {
        var t = byId[id];
        if (!t) return;
        var chip = el('li', earned.has(id) ? 'done' : null, '#' + id + ' ' + t.name);
        chips.appendChild(chip);
      });
      li.appendChild(chips);
      list.appendChild(li);
    });
  }

  function renderMissables() {
    var list = $('missable-list');
    list.innerHTML = '';
    trophies.filter(function (t) { return guideById[t.id] && guideById[t.id].missable; })
      .forEach(function (t) {
        var g = guideById[t.id];
        var card = el('article', 'missable-card');
        card.appendChild(el('h3', null, '#' + t.id + ' — ' + t.name + ' (' + t.grade + ')'));
        card.appendChild(el('p', null, 'Official: ' + t.description));
        card.appendChild(el('p', null, g.first_step));
        var warn = el('p');
        warn.appendChild(el('strong', null, 'Why it can be missed: '));
        warn.appendChild(document.createTextNode(g.watch_out));
        card.appendChild(warn);
        list.appendChild(card);
      });
  }

  function renderList() {
    var list = $('trophy-list');
    list.innerHTML = '';
    var shown = 0;
    trophies.forEach(function (t) {
      if (!matchesFilters(t)) return;
      shown++;
      var g = guideById[t.id] || {};
      var card = el('article', 'trophy-card' + (earned.has(t.id) ? ' earned' : ''));
      card.id = 'trophy-' + t.id;
      card.dataset.trophyId = String(t.id);

      var head = el('div', 'trophy-head');
      var box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = earned.has(t.id);
      box.setAttribute('aria-label', 'Mark trophy ' + t.id + ' as earned');
      box.addEventListener('change', function () {
        if (box.checked) earned.add(t.id); else earned.delete(t.id);
        saveStored();
        updateProgress();
        renderRoadmap();
        renderList();
      });
      head.appendChild(box);

      var titleWrap = el('div');
      var hidden = isHiddenStory(t);
      titleWrap.appendChild(el('h3', null, '#' + t.id + ' — ' + (hidden ? 'Hidden story trophy' : t.name)));
      titleWrap.appendChild(el('p', 'official', hidden ? 'Hidden until earned (spoiler setting on).' : 'Official: ' + t.description));
      head.appendChild(titleWrap);
      head.appendChild(el('span', 'grade-pill grade-' + t.grade, t.grade));
      card.appendChild(head);

      var tags = el('div', 'tags');
      tags.appendChild(el('span', 'tag', KIND_LABELS[g.kind] || g.kind || '—'));
      tags.appendChild(el('span', 'tag', 'Roadmap stage ' + (g.stage || '?')));
      if (g.missable) tags.appendChild(el('span', 'tag missable-tag', 'MISSABLE'));
      if (t.grade) tags.appendChild(el('span', 'tag', 'PS5 · ' + t.grade));
      card.appendChild(tags);

      var guideBox = el('div', 'guide-box');
      guideBox.appendChild(el('h4', null, 'Guide'));
      var step = el('p');
      step.appendChild(el('span', 'label', 'First step: '));
      step.appendChild(document.createTextNode(g.first_step || t.guide || ''));
      guideBox.appendChild(step);
      var watch = el('p');
      watch.appendChild(el('span', 'label', 'Watch out: '));
      watch.appendChild(document.createTextNode(g.watch_out || ''));
      guideBox.appendChild(watch);
      var srcLine = el('p', 'guide-sources', 'Sources: ');
      (g.sources || ['official']).forEach(function (sid, i) {
        var s = sourceLabel(sid);
        if (i > 0) srcLine.appendChild(document.createTextNode(' · '));
        if (s) {
          var a = document.createElement('a');
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
      list.appendChild(card);
    });
    $('result-count').textContent = shown + ' of ' + TOTAL + ' trophies shown';
    $('empty-note').hidden = shown !== 0;
  }

  function renderSources() {
    var list = $('source-list');
    list.innerHTML = '';
    sources.forEach(function (s) {
      var li = el('li');
      var a = document.createElement('a');
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = s.label;
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  function renderAll() {
    updateProgress();
    renderRoadmap();
    renderMissables();
    renderList();
    renderSources();
  }

  function bindToolbar() {
    $('search').addEventListener('input', function (e) {
      state.query = e.target.value.trim().toLowerCase();
      renderList();
    });
    document.querySelectorAll('#kind-filters .kind-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#kind-filters .kind-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        state.kind = btn.dataset.kind;
        renderList();
      });
    });
    $('grade-filter').addEventListener('change', function (e) {
      state.grade = e.target.value;
      renderList();
    });
    $('spoiler-toggle').addEventListener('change', function (e) {
      state.spoiler = e.target.checked;
      renderList();
    });
    $('earned-only').addEventListener('change', function (e) {
      state.earnedOnly = e.target.checked;
      renderList();
    });
    $('export-btn').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify({ earned: Array.from(earned).sort(function (a, b) { return a - b; }), exported_at: new Date().toISOString() }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'gta6-trophy-progress.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
    $('import-file').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          var ids = Array.isArray(data) ? data : data.earned;
          if (!Array.isArray(ids)) throw new Error('no earned list');
          earned = new Set(ids.map(Number).filter(function (id) { return byId[id]; }));
          saveStored();
          renderAll();
        } catch (err) {
          window.alert('That file is not a trophy-progress export.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
    $('reset-btn').addEventListener('click', function () {
      if (!window.confirm('Clear all earned trophies?')) return;
      earned = new Set();
      saveStored();
      renderAll();
    });
  }

  function applyShotView() {
    var target = null;
    if (shot === 'roadmap') target = $('roadmap');
    else if (shot === 'missables') target = $('missables');
    else if (shot === 'guide') target = $('trophy-' + focusId) || $('tracker');
    else target = $('tracker');
    if (target) {
      if (shot === 'guide') target.classList.add('flash');
      target.scrollIntoView({ block: 'start' });
    }
    window.__shotReady = true;
  }

  function boot() {
    loadStored();
    bindToolbar();
    Promise.all([
      fetch('data/trophies.json').then(function (r) { return r.json(); }),
      fetch('data/guides.json').then(function (r) { return r.json(); })
    ]).then(function (pair) {
      var raw = pair[0];
      var list = Array.isArray(raw) ? raw : raw.trophies;
      trophies = list.slice().sort(function (a, b) { return a.id - b.id; });
      trophies.forEach(function (t) { byId[t.id] = t; });
      var guides = pair[1];
      (guides.guides || []).forEach(function (g) { guideById[g.id] = g; });
      roadmap = guides.roadmap || [];
      sources = guides.sources || [];
      applySeed();
      renderAll();
      setTimeout(applyShotView, 60);
    }).catch(function () {
      $('progress-text').textContent = 'Could not load the trophy data. Serve app/ over HTTP (for example: node serve.ts) and reload.';
      window.__shotReady = true;
    });
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
