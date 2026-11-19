// Leonida Legend — GTA VI trophy guide & tracker. Static, offline, no network.
// Loads the official list (trophies.json) and this entry's own guides (guides.json),
// keeps progress in localStorage, and renders checklist / roadmap / missables / planner.
const TROPHY_URL = "data/trophies.json";
const GUIDE_URL = "data/guides.json";
const STORE_KEY = "leonida-legend-progress-v1";
const PLAN_KEY = "leonida-legend-planner-v1";
const THEME_KEY = "leonida-legend-theme-v1";
const SPOILER_KEY = "leonida-legend-spoiler-v1";

const PHASES = [
  { n: 1, title: "Story I — Vice City opens", blurb: "Chapters 1–2 and the first jobs: Gone Fishing through Child's Play." },
  { n: 2, title: "Story II — The climb", blurb: "Chapters 3–4, the big heists, and the final mission." },
  { n: 3, title: "Contacts & strangers", blurb: "The five contact strands (Andy, Kenton, Billy, Randy, Tyrone) plus 8 stranger strands." },
  { n: 4, title: "Activities & skills", blurb: "Stunts, shooting range, races, fishing, arcade, meditation, hunting, combat." },
  { n: 5, title: "Collectibles & Leonida", blurb: "Cards, WAiNK tags, vehicles, areas, money and property." },
  { n: 6, title: "Partner & one-time moments", blurb: "Partner trophies, heists and the missables — do these before they pass." },
];
const KIND_LABELS = {
  story: "Story", activity: "Activity", collectible: "Collectible",
  crime: "Crime & heist", exploration: "Exploration", partner: "Partner", misc: "Other",
};
const SEED_IDS = [2, 3, 4, 8, 9, 10, 16, 18, 20, 21, 28, 44, 46];
const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };

let trophies = [];
let guides = {};
let earned = new Set();
let planner = [];
let spoiler = true;
let view = "checklist";
let selectedId = null;
let searchText = "";
let gradeFilter = "";
let kindFilter = "";
let hideEarned = false;

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
}

function applySeedIfRequested() {
  const seed = params.get("seed");
  if (!seed) return;
  const wanted = Number(seed);
  if (!Number.isFinite(wanted) || wanted <= 0) return;
  const hasSaved = localStorage.getItem(STORE_KEY) !== null;
  if (hasSaved) return;
  earned = new Set(SEED_IDS.slice(0, wanted));
  writeStore(STORE_KEY, [...earned]);
}

function trophyById(id) {
  return trophies.find((t) => t.id === id) || null;
}
function guideFor(id) {
  return guides[String(id)] || { steps: [], note: "", sources: [], missable: false, missable_note: null };
}
function isStoryHidden(t) {
  return spoiler && t.story && !earned.has(t.id);
}
function displayName(t) {
  return isStoryHidden(t) ? "Hidden story trophy" : t.name;
}
function displayDesc(t) {
  return isStoryHidden(t) ? "Hidden until earned — finish the story to reveal it." : t.description;
}

function renderProgress() {
  const total = trophies.length;
  const done = earned.size;
  const pct = total ? Math.round((done / total) * 100) : 0;
  $("progressText").textContent = `${done} / ${total} earned`;
  $("progressPct").textContent = `${pct}%`;
  $("progressFill").style.width = `${pct}%`;
  const miss = trophies.filter((t) => guideFor(t.id).missable).length;
  $("missCount").textContent = `(${miss})`;
}

function filteredTrophies() {
  const q = searchText.trim().toLowerCase();
  return trophies
    .filter((t) => !gradeFilter || t.grade === gradeFilter)
    .filter((t) => !kindFilter || t.kind === kindFilter)
    .filter((t) => !hideEarned || !earned.has(t.id))
    .filter((t) => {
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    })
    .sort((a, b) => a.id - b.id);
}

function gradeChip(t) {
  return `<span class="grade grade-${t.grade}">${t.grade}</span>`;
}
function missableFlag(t) {
  const g = guideFor(t.id);
  return g.missable ? `<span class="flag flag-danger">Missable</span>` : "";
}

function renderList() {
  const list = $("trophyList");
  const rows = filteredTrophies();
  $("listMeta").textContent = `Showing ${rows.length} of ${trophies.length} trophies` +
    (earned.size ? ` · ${earned.size} earned` : "");
  list.innerHTML = rows.map((t) => {
    const g = guideFor(t.id);
    return `<li class="trophy-row${selectedId === t.id ? " selected" : ""}">
      <input type="checkbox" data-earn="${t.id}" ${earned.has(t.id) ? "checked" : ""} aria-label="Mark ${displayName(t)} earned">
      <div>
        <div class="trophy-name"><button type="button" data-open="${t.id}">${escapeHtml(displayName(t))}</button></div>
        <div class="trophy-desc">${escapeHtml(displayDesc(t))}</div>
        <div class="trophy-tags">${gradeChip(t)}${missableFlag(t)}<span class="kind">${KIND_LABELS[t.kind] || t.kind} · Phase ${t.phase}</span></div>
      </div>
      <div>${g.missable ? "" : ""}</div>
    </li>`;
  }).join("");
  list.querySelectorAll("[data-earn]").forEach((box) => {
    box.addEventListener("change", () => {
      const id = Number(box.dataset.earn);
      if (box.checked) earned.add(id); else earned.delete(id);
      writeStore(STORE_KEY, [...earned]);
      renderAll();
    });
  });
  list.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => { selectedId = Number(btn.dataset.open); renderAll(); });
  });
}

function renderDetail() {
  const pane = $("detailPane");
  const t = selectedId ? trophyById(selectedId) : null;
  if (!t) {
    pane.innerHTML = `<h2>How to use this guide</h2>
      <p class="empty">Pick a trophy on the left to see its full guide, with steps and sources. Tick the box when you earn one — progress is saved in this browser.</p>
      <p class="empty">Start with the Roadmap tab for the order to play in, and check the Missables tab early: 8 trophies can pass you by.</p>`;
    return;
  }
  const g = guideFor(t.id);
  const inPlan = planner.includes(t.id);
  pane.innerHTML = `
    <h2>${escapeHtml(displayName(t))}</h2>
    <div class="trophy-tags">${gradeChip(t)}${missableFlag(t)}<span class="kind">${KIND_LABELS[t.kind] || t.kind} · Phase ${t.phase}</span></div>
    <p class="official">Official: “${escapeHtml(displayDesc(t))}”</p>
    ${g.missable && g.missable_note ? `<div class="warn"><strong>Missable:</strong> ${escapeHtml(g.missable_note)}</div>` : ""}
    <h3>Guide</h3>
    <ol>${g.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>
    ${g.note ? `<p>${escapeHtml(g.note)}</p>` : ""}
    <div class="actions">
      <button type="button" id="detailEarn">${earned.has(t.id) ? "Mark not earned" : "Mark earned"}</button>
      <button type="button" id="detailPlan">${inPlan ? "Remove from planner" : "Add to next-up planner"}</button>
    </div>
    <div class="sources"><strong>Sources:</strong> ${g.sources.map(escapeHtml).join(" · ")}</div>`;
  $("detailEarn").addEventListener("click", () => {
    if (earned.has(t.id)) earned.delete(t.id); else earned.add(t.id);
    writeStore(STORE_KEY, [...earned]);
    renderAll();
  });
  $("detailPlan").addEventListener("click", () => {
    if (inPlan) planner = planner.filter((x) => x !== t.id);
    else planner.push(t.id);
    writeStore(PLAN_KEY, planner);
    renderAll();
  });
}

function renderRoadmap() {
  const box = $("roadmapView");
  box.innerHTML = PHASES.map((ph) => {
    const items = trophies.filter((t) => t.phase === ph.n);
    const done = items.filter((t) => earned.has(t.id)).length;
    const pct = items.length ? Math.round((done / items.length) * 100) : 0;
    return `<div class="roadmap-phase">
      <h3>Phase ${ph.n} — ${escapeHtml(ph.title)}</h3>
      <p>${escapeHtml(ph.blurb)}</p>
      <div class="phase-bar"><div style="width:${pct}%"></div></div>
      <div>${done} / ${items.length} earned (${pct}%)</div>
      <ul class="phase-list">${items.map((t) => `<li>${earned.has(t.id) ? "✓ " : "· "}${escapeHtml(displayName(t))}</li>`).join("")}</ul>
    </div>`;
  }).join("");
}

function renderMissables() {
  const box = $("missablesView");
  const items = trophies.filter((t) => guideFor(t.id).missable);
  if (!items.length) { box.innerHTML = `<p class="miss-empty">No missable trophies flagged.</p>`; return; }
  box.innerHTML = items.map((t) => {
    const g = guideFor(t.id);
    return `<div class="miss-card">
      <h3>${escapeHtml(displayName(t))} ${gradeChip(t)}</h3>
      <p>${escapeHtml(displayDesc(t))}</p>
      ${g.missable_note ? `<p><strong>Why it can pass you by:</strong> ${escapeHtml(g.missable_note)}</p>` : ""}
      <ol>${g.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>
      <div class="sources"><strong>Sources:</strong> ${g.sources.map(escapeHtml).join(" · ")}</div>
    </div>`;
  }).join("");
}

function renderPlanner() {
  const box = $("plannerView");
  if (!planner.length) {
    box.innerHTML = `<p class="plan-empty">Your next-up queue is empty. Open a trophy's guide and press “Add to next-up planner” to build your order of play.</p>`;
    return;
  }
  box.innerHTML = planner.map((id, i) => {
    const t = trophyById(id);
    if (!t) return "";
    return `<div class="plan-card">
      <h3>${i + 1}. ${escapeHtml(displayName(t))} ${gradeChip(t)}</h3>
      <p>${escapeHtml(displayDesc(t))}</p>
      <div class="actions">
        <button type="button" data-plan-up="${id}" ${i === 0 ? "disabled" : ""}>Move up</button>
        <button type="button" data-plan-down="${id}" ${i === planner.length - 1 ? "disabled" : ""}>Move down</button>
        <button type="button" data-plan-remove="${id}">Remove</button>
        <button type="button" data-plan-open="${id}">Open guide</button>
      </div>
    </div>`;
  }).join("");
  box.querySelectorAll("[data-plan-up]").forEach((b) => b.addEventListener("click", () => movePlan(Number(b.dataset.planUp), -1)));
  box.querySelectorAll("[data-plan-down]").forEach((b) => b.addEventListener("click", () => movePlan(Number(b.dataset.planDown), 1)));
  box.querySelectorAll("[data-plan-remove]").forEach((b) => b.addEventListener("click", () => {
    planner = planner.filter((x) => x !== Number(b.dataset.planRemove));
    writeStore(PLAN_KEY, planner);
    renderAll();
  }));
  box.querySelectorAll("[data-plan-open]").forEach((b) => b.addEventListener("click", () => {
    selectedId = Number(b.dataset.planOpen);
    setView("checklist");
  }));
}
function movePlan(id, delta) {
  const i = planner.indexOf(id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= planner.length) return;
  [planner[i], planner[j]] = [planner[j], planner[i]];
  writeStore(PLAN_KEY, planner);
  renderAll();
}

function setView(next) {
  view = next;
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === view);
  });
  $("trophyList").hidden = view !== "checklist";
  $("listMeta").hidden = view !== "checklist";
  document.querySelector(".toolbar").style.display = view === "checklist" ? "" : "none";
  $("roadmapView").hidden = view !== "roadmap";
  $("missablesView").hidden = view !== "missables";
  $("plannerView").hidden = view !== "planner";
  renderAll();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderAll() {
  renderProgress();
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissables();
  renderPlanner();
  window.__shotReady = true;
}

function exportProgress() {
  const payload = { app: "leonida-legend", earned: [...earned].sort((a, b) => a - b), planner, exported_at: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "leonida-legend-progress.json";
  a.click();
  URL.revokeObjectURL(a.href);
}
function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      if (Array.isArray(data.earned)) {
        earned = new Set(data.earned.filter((id) => trophyById(id)));
        writeStore(STORE_KEY, [...earned]);
      }
      if (Array.isArray(data.planner)) {
        planner = data.planner.filter((id) => trophyById(id));
        writeStore(PLAN_KEY, planner);
      }
      renderAll();
    } catch {
      alert("That file is not a Leonida Legend progress export.");
    }
  };
  reader.readAsText(file);
}

async function loadData() {
  const [tRes, gRes] = await Promise.all([fetch(TROPHY_URL), fetch(GUIDE_URL)]);
  const tData = await tRes.json();
  trophies = tData.trophies.slice().sort((a, b) => a.id - b.id);
  guides = await gRes.json();
}

function initControls() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => setView(tab.dataset.view));
  });
  $("searchBox").addEventListener("input", (e) => { searchText = e.target.value; renderList(); });
  $("gradeFilter").addEventListener("change", (e) => { gradeFilter = e.target.value; renderList(); });
  $("kindFilter").addEventListener("change", (e) => { kindFilter = e.target.value; renderList(); });
  $("hideEarned").addEventListener("change", (e) => { hideEarned = e.target.checked; renderList(); });
  $("themeBtn").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "paper" ? "night" : "paper";
    document.documentElement.dataset.theme = next;
    $("themeBtn").textContent = next === "paper" ? "Night theme" : "Paper theme";
    writeStore(THEME_KEY, next);
  });
  $("spoilerBtn").addEventListener("click", () => {
    spoiler = !spoiler;
    $("spoilerBtn").textContent = spoiler ? "Spoilers hidden" : "Spoilers shown";
    $("spoilerBtn").setAttribute("aria-pressed", String(spoiler));
    writeStore(SPOILER_KEY, spoiler);
    renderAll();
  });
  $("exportBtn").addEventListener("click", exportProgress);
  $("importFile").addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) importProgress(e.target.files[0]);
    e.target.value = "";
  });
}

async function boot() {
  const savedTheme = readStore(THEME_KEY, "paper");
  document.documentElement.dataset.theme = savedTheme === "night" ? "night" : "paper";
  $("themeBtn").textContent = savedTheme === "night" ? "Paper theme" : "Night theme";
  spoiler = readStore(SPOILER_KEY, true);
  $("spoilerBtn").textContent = spoiler ? "Spoilers hidden" : "Spoilers shown";
  $("spoilerBtn").setAttribute("aria-pressed", String(spoiler));
  earned = new Set(readStore(STORE_KEY, []).filter((id) => Number.isInteger(id)));
  planner = readStore(PLAN_KEY, []).filter((id) => Number.isInteger(id));
  applySeedIfRequested();
  await loadData();
  earned = new Set([...earned].filter((id) => trophyById(id)));
  planner = planner.filter((id) => trophyById(id));
  initControls();
  const shot = params.get("shot");
  const focus = params.get("focus");
  if (focus && trophyById(Number(focus))) selectedId = Number(focus);
  if (shot === "roadmap" || shot === "missables" || shot === "planner") setView(shot);
  else if (shot === "guide" && !selectedId) selectedId = 33;
  else setView("checklist");
  if (shot === "guide" && selectedId) view = "checklist";
  renderAll();
}
boot().catch((err) => {
  document.getElementById("detailPane").innerHTML = `<p class="empty">Could not load the trophy data: ${escapeHtml(err.message)}</p>`;
  window.__shotReady = true;
});
