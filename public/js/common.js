// Shared helpers
window.API = { habits: "/api/habits" };

window.utils = {
  safeArray(v) {
    return Array.isArray(v) ? v : [];
  },

  daysInMonth(year, monthZeroBased) {
    return new Date(year, monthZeroBased + 1, 0).getDate();
  },

  toISODateLocal(year, monthZeroBased, day) {
    const y = String(year);
    const m = String(monthZeroBased + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${y}-${m}-${d}`;
  },

  addDaysISO(iso, delta) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + delta);
    return this.toISODateLocal(dt.getFullYear(), dt.getMonth(), dt.getDate());
  },

  // Streak from last checked day backwards (works even if month changes)
  calcStreak(logs) {
    const set = new Set(this.safeArray(logs).filter(Boolean));
    if (set.size === 0) return 0;

    const sorted = Array.from(set).sort(); // ISO sorts as string
    let cur = sorted[sorted.length - 1];
    let streak = 1;

    while (true) {
      const prev = this.addDaysISO(cur, -1);
      if (set.has(prev)) {
        streak += 1;
        cur = prev;
      } else {
        break;
      }
    }
    return streak;
  },
};
