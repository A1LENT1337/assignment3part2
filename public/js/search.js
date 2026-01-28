const searchInput = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearBtn");
const results = document.getElementById("results");
const countPill = document.getElementById("countPill");
const sectionTitle = document.getElementById("sectionTitle");

let allHabits = [];

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function makeCard(h) {
  const logs = utils.safeArray(h.logs);
  const streak = utils.calcStreak(logs);

  const el = document.createElement("div");
  el.className = "result-card fade-in";
  el.innerHTML = `
    <div class="row-between">
      <strong>${escapeHtml(h.title || "Untitled")}</strong>
      <span class="tag">${escapeHtml(h.category || "General")}</span>
    </div>
    <p class="muted" style="margin:10px 0 0;">Goal: <strong>${Number(h.goal || 0)}</strong></p>
    <p class="muted" style="margin:6px 0 0;">Streak: <strong>${streak}</strong></p>
    <div class="muted small" style="margin-top:10px;">Logs (${logs.length}):</div>
    <div class="muted small" style="margin-top:6px;">${escapeHtml(logs.slice().sort().join(", ") || "No logs")}</div>
    <div style="margin-top:12px;">
      <a class="btn btn-ghost" target="_blank" href="/api/habits/${h._id}">Open API</a>
    </div>
  `;
  return el;
}

function render(query) {
  const q = (query || "").trim().toLowerCase();
  results.innerHTML = "";

  if (!q) {
    sectionTitle.textContent = "Recent Habits";
    const recent = allHabits.slice(0, 6);
    countPill.textContent = String(recent.length);
    for (const h of recent) results.appendChild(makeCard(h));
    return;
  }

  sectionTitle.textContent = "Search Results";
  const filtered = allHabits.filter((h) => String(h.title || "").toLowerCase().includes(q));
  countPill.textContent = String(filtered.length);
  for (const h of filtered) results.appendChild(makeCard(h));
}

async function init() {
  const res = await fetch(`${API.habits}?sort=desc`);
  if (!res.ok) throw new Error("Failed to load habits");
  allHabits = await res.json();

  // normalize goal for UI
  allHabits = allHabits.map((h) => ({
    ...h,
    goal: typeof h.goal === "number" ? h.goal : Number(h.goal) || 0,
    logs: utils.safeArray(h.logs),
  }));

  render("");
}

searchInput.addEventListener("input", (e) => render(e.target.value));
clearBtn.addEventListener("click", () => { searchInput.value = ""; render(""); });

init().catch(() => alert("Search failed. Check server /api/habits"));
