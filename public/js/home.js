const box = document.getElementById("homeStats");

function card(title, value, subtitle) {
  const el = document.createElement("div");
  el.className = "result-card fade-in";
  el.innerHTML = `
    <h3 style="margin:0 0 6px;">${title}</h3>
    <div style="font-size:26px; font-weight:900;">${value}</div>
    <div class="muted small" style="margin-top:6px;">${subtitle}</div>
  `;
  return el;
}

function monthPrefix(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-`;
}

(async function initHome() {
  try {
    const res = await fetch(`${API.habits}?sort=desc`);
    if (!res.ok) throw new Error("Failed to load habits");

    const habits = await res.json();
    const now = new Date();
    const prefix = monthPrefix(now);
    const dim = utils.daysInMonth(now.getFullYear(), now.getMonth());

    const totalHabits = habits.length;

    let bestStreak = 0;
    let topHabitTitle = "-";
    let topHabitDone = 0;

    let allDone = 0;
    let allCells = totalHabits * dim;

    for (const h of habits) {
      const logs = utils.safeArray(h.logs);
      const streak = utils.calcStreak(logs);
      if (streak > bestStreak) bestStreak = streak;

      const doneThisMonth = logs.filter((d) => String(d).startsWith(prefix)).length;
      allDone += doneThisMonth;

      if (doneThisMonth > topHabitDone) {
        topHabitDone = doneThisMonth;
        topHabitTitle = h.title || "-";
      }
    }

    const overall = allCells ? Math.round((allDone / allCells) * 100) : 0;

    box.innerHTML = "";
    box.appendChild(card("Total habits", totalHabits, "All habits in database"));
    box.appendChild(card("Monthly completion", `${overall}%`, "Based on current month grid"));
    box.appendChild(card("Best streak", bestStreak, "Longest current streak across habits"));
    box.appendChild(card("Top habit this month", topHabitTitle, `Completed ${topHabitDone} days`));
  } catch (e) {
    box.innerHTML = "";
    box.appendChild(card("Error", "API", "Failed to load /api/habits"));
  }
})();
