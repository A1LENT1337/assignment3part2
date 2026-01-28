const gridHeader = document.getElementById("gridHeader");
const gridBody = document.getElementById("gridBody");
const monthLabel = document.getElementById("monthLabel");
const overallBar = document.getElementById("overallBar");
const overallPercent = document.getElementById("overallPercent");

const refreshBtn = document.getElementById("refreshBtn");
const createForm = document.getElementById("createForm");
const titleInput = document.getElementById("titleInput");
const goalInput = document.getElementById("goalInput");
const categoryInput = document.getElementById("categoryInput");

// Edit modal
const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editForm");
const editTitle = document.getElementById("editTitle");
const editGoal = document.getElementById("editGoal");
const editCategory = document.getElementById("editCategory");
const editCancel = document.getElementById("editCancel");

let habits = [];
let editingId = null;

const now = new Date();
const YEAR = now.getFullYear();
const MONTH = now.getMonth();
const DAYS_IN_MONTH = utils.daysInMonth(YEAR, MONTH);

monthLabel.textContent = `Tracking: ${now.toLocaleString(undefined, { month: "long" })} ${YEAR}`;

function monthPrefix() {
  return `${YEAR}-${String(MONTH + 1).padStart(2, "0")}-`;
}

function habitMonthDoneCount(habit) {
  const logs = utils.safeArray(habit.logs);
  return logs.filter((iso) => String(iso).startsWith(monthPrefix())).length;
}

function habitPercent(habit) {
  return Math.round((habitMonthDoneCount(habit) / DAYS_IN_MONTH) * 100);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function buildHeader() {
  gridHeader.innerHTML = `
    <div class="habit-left">
      <strong>Habits</strong>
      <div class="muted small">Progress • Streak</div>
    </div>
    <div class="header-days">
      ${Array.from({ length: 31 }, (_, i) => `<div class="header-day">${i + 1}</div>`).join("")}
    </div>
    <div class="menu-col"></div>
  `;
}

function closeAllMenus() {
  document.querySelectorAll(".menu.open").forEach((m) => m.classList.remove("open"));
}

document.addEventListener("click", (e) => {
  const kebab = e.target.closest(".kebab");
  const actionBtn = e.target.closest(".menu button");
  const menu = e.target.closest(".menu");

  if (kebab) {
    const wrap = kebab.closest(".dropdown");
    const m = wrap.querySelector(".menu");
    const isOpen = m.classList.contains("open");
    closeAllMenus();
    if (!isOpen) m.classList.add("open");
    return;
  }

  if (actionBtn) {
    const action = actionBtn.dataset.action;
    const id = actionBtn.dataset.id;
    closeAllMenus();
    handleAction(action, id);
    return;
  }

  if (!menu) closeAllMenus();
});

function render() {
  gridBody.innerHTML = "";

  for (const habit of habits) {
    const pct = habitPercent(habit);
    const streak = utils.calcStreak(utils.safeArray(habit.logs));

    const row = document.createElement("div");
    row.className = "habit-row fade-in";

    const left = document.createElement("div");
    left.className = "habit-left";
    left.innerHTML = `
      <div class="habit-left-top">
        <div>
          <div class="habit-title">${escapeHtml(habit.title || "Untitled")}</div>
          <div class="muted small">Goal: <strong>${Number(habit.goal || 0)}</strong></div>
        </div>
        <span class="tag">${escapeHtml(habit.category || "General")}</span>
      </div>

      <div class="progress habit-mini-progress">
        <div class="progress-bar" style="width:${pct}%"></div>
      </div>

      <div class="habit-meta">
        <span>${pct}%</span>
        <span>Streak: <strong>${streak}</strong></span>
        <span>${habitMonthDoneCount(habit)}/${DAYS_IN_MONTH}</span>
      </div>
    `;

    const days = document.createElement("div");
    days.className = "days-grid";

    for (let day = 1; day <= 31; day++) {
      const cell = document.createElement("div");
      cell.className = "day-cell";

      if (day > DAYS_IN_MONTH) {
        cell.style.opacity = "0.25";
        const disabled = document.createElement("input");
        disabled.type = "checkbox";
        disabled.disabled = true;
        cell.appendChild(disabled);
      } else {
        const iso = utils.toISODateLocal(YEAR, MONTH, day);
        const checked = utils.safeArray(habit.logs).includes(iso);

        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = checked;

        // Change state only after server success
        input.addEventListener("click", async (e) => {
          e.preventDefault();
          await toggleDate(habit._id, iso);
        });

        cell.appendChild(input);
      }

      days.appendChild(cell);
    }

    const menuCol = document.createElement("div");
    menuCol.className = "menu-col";

    const dropdown = document.createElement("div");
    dropdown.className = "dropdown";
    dropdown.innerHTML = `
      <button class="kebab" aria-label="menu">...</button>
      <div class="menu">
        <button data-action="edit" data-id="${habit._id}">Edit</button>
        <button class="danger" data-action="delete" data-id="${habit._id}">Delete</button>
      </div>
    `;
    menuCol.appendChild(dropdown);

    row.appendChild(left);
    row.appendChild(days);
    row.appendChild(menuCol);

    gridBody.appendChild(row);
  }

  updateOverallProgress();
}

async function safeJson(res) {
  try { return await res.json(); } catch { return null; }
}

async function loadHabits() {
  const res = await fetch(API.habits);
  if (!res.ok) throw new Error("Failed to load habits");
  habits = await res.json();

  // Ensure numbers in UI even if DB had old strings
  habits = habits.map((h) => ({
    ...h,
    goal: typeof h.goal === "number" ? h.goal : Number(h.goal) || 0,
    logs: utils.safeArray(h.logs),
  }));
}

function updateOverallProgress() {
  const totalCells = habits.length * DAYS_IN_MONTH;
  if (!totalCells) {
    overallBar.style.width = "0%";
    overallPercent.textContent = "0%";
    return;
  }

  let done = 0;
  for (const h of habits) done += habitMonthDoneCount(h);

  const pct = Math.round((done / totalCells) * 100);
  overallBar.style.width = `${pct}%`;
  overallPercent.textContent = `${pct}%`;
}

async function toggleDate(id, iso) {
  const res = await fetch(`${API.habits}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toggleDate: iso }),
  });

  if (!res.ok) {
    const err = await safeJson(res);
    alert(err?.error || `Toggle failed. Status ${res.status}`);
    return;
  }

  const updated = await res.json();
  habits = habits.map((h) => (h._id === updated._id ? updated : h));
  render();
}

createForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    title: titleInput.value.trim(),
    goal: Number(goalInput.value),
    category: categoryInput.value.trim(),
  };

  const res = await fetch(API.habits, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.status === 201) {
    titleInput.value = "";
    goalInput.value = "";
    categoryInput.value = "";
    await init();
    return;
  }

  const err = await safeJson(res);
  alert(err?.error || `Create failed. Status ${res.status}`);
});

refreshBtn.addEventListener("click", init);

// Menu actions
function openEditModal(habit) {
  editingId = habit._id;
  editTitle.value = habit.title || "";
  editGoal.value = Number(habit.goal || 0);
  editCategory.value = habit.category || "";
  editModal.classList.add("show");
}

function closeEditModal() {
  editingId = null;
  editModal.classList.remove("show");
}

editCancel.addEventListener("click", closeEditModal);
editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeEditModal();
});

editForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!editingId) return;

  const payload = {
    title: editTitle.value.trim(),
    goal: Number(editGoal.value),
    category: editCategory.value.trim(),
  };

  const res = await fetch(`${API.habits}/${editingId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await safeJson(res);
    alert(err?.error || `Update failed. Status ${res.status}`);
    return;
  }

  closeEditModal();
  await init();
});

async function handleAction(action, id) {
  const habit = habits.find((h) => h._id === id);
  if (!habit) return;

  if (action === "edit") {
    openEditModal(habit);
    return;
  }

  if (action === "delete") {
    const ok = confirm("Delete this habit?");
    if (!ok) return;

    const res = await fetch(`${API.habits}/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await safeJson(res);
      alert(err?.error || `Delete failed. Status ${res.status}`);
      return;
    }
    await init();
  }
}

async function init() {
  buildHeader();
  await loadHabits();
  render();
}

init().catch((e) => alert(`Init failed: ${e.message}`));

