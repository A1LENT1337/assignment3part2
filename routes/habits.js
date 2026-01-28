const express = require("express");
const { ObjectId } = require("mongodb");
const { getHabitsCollection } = require("../database/db");

const router = express.Router();

function isValidObjectId(id) {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
}

function normalizeISODate(dateStr) {
  if (typeof dateStr !== "string") return null;
  const s = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

function buildProjection(fieldsParam) {
  if (!fieldsParam) return null;
  const fields = fieldsParam
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  if (!fields.length) return null;

  const proj = { _id: 1 };
  for (const f of fields) proj[f] = 1;
  return proj;
}

// GET /api/habits?category=&sort=asc|desc&fields=title,category
router.get("/", async (req, res) => {
  try {
    const habits = getHabitsCollection();
    const { category, sort, fields } = req.query;

    const filter = {};
    if (category) filter.category = String(category);

    const sortDir = String(sort).toLowerCase() === "asc" ? 1 : -1;
    const projection = buildProjection(fields);

    let cursor = habits.find(filter);

    if (projection) cursor = cursor.project(projection);
    cursor = cursor.sort({ createdAt: sortDir });

    const result = await cursor.toArray();

    // Compatibility: old DB may contain goal as string
    const normalized = result.map((h) => ({
      ...h,
      goal: typeof h.goal === "number" ? h.goal : Number(h.goal) || 0,
      logs: Array.isArray(h.logs) ? h.logs : [],
    }));

    res.status(200).json(normalized);
  } catch (err) {
    console.error("GET /api/habits error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/habits/:id
router.get("/:id", async (req, res) => {
  try {
    const habits = getHabitsCollection();
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Bad Request: invalid id" });
    }

    const habit = await habits.findOne({ _id: new ObjectId(id) });
    if (!habit) return res.status(404).json({ error: "Not Found" });

    habit.goal = typeof habit.goal === "number" ? habit.goal : Number(habit.goal) || 0;
    habit.logs = Array.isArray(habit.logs) ? habit.logs : [];

    res.status(200).json(habit);
  } catch (err) {
    console.error("GET /api/habits/:id error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/habits
// Body: { title, goal(number), category }
router.post("/", async (req, res) => {
  try {
    const habits = getHabitsCollection();
    const { title, goal, category } = req.body || {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Bad Request: missing title" });
    }

    const goalNum = Number(goal);
    if (!Number.isFinite(goalNum) || goalNum <= 0) {
      return res.status(400).json({ error: "Bad Request: goal must be a positive number" });
    }

    if (!category || typeof category !== "string" || !category.trim()) {
      return res.status(400).json({ error: "Bad Request: missing category" });
    }

    const now = new Date();
    const doc = {
      title: title.trim(),
      goal: goalNum,
      category: category.trim(),
      logs: [],
      createdAt: now,
      updatedAt: now,
    };

    const insert = await habits.insertOne(doc);
    const created = await habits.findOne({ _id: insert.insertedId });

    res.status(201).json(created);
  } catch (err) {
    console.error("POST /api/habits error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /api/habits/:id
// Toggle: { toggleDate: "YYYY-MM-DD" }
// Update: { title?, goal?, category? }
router.put("/:id", async (req, res) => {
  try {
    const habits = getHabitsCollection();
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Bad Request: invalid id" });
    }

    const _id = new ObjectId(id);

    // Toggle date
    if (typeof req.body?.toggleDate !== "undefined") {
      const d = normalizeISODate(req.body.toggleDate);
      if (!d) return res.status(400).json({ error: "Bad Request: toggleDate must be YYYY-MM-DD" });

      const habit = await habits.findOne({ _id });
      if (!habit) return res.status(404).json({ error: "Not Found" });

      const logs = Array.isArray(habit.logs) ? habit.logs : [];
      const exists = logs.includes(d);

      const update = exists ? { $pull: { logs: d } } : { $addToSet: { logs: d } };
      await habits.updateOne({ _id }, { ...update, $set: { updatedAt: new Date() } });

      const updated = await habits.findOne({ _id });
      updated.goal = typeof updated.goal === "number" ? updated.goal : Number(updated.goal) || 0;
      updated.logs = Array.isArray(updated.logs) ? updated.logs : [];

      return res.status(200).json(updated);
    }

    // Update fields
    const { title, goal, category } = req.body || {};
    const set = {};

    if (typeof title === "string" && title.trim()) set.title = title.trim();
    if (typeof category === "string" && category.trim()) set.category = category.trim();

    if (typeof goal !== "undefined") {
      const goalNum = Number(goal);
      if (!Number.isFinite(goalNum) || goalNum <= 0) {
        return res.status(400).json({ error: "Bad Request: goal must be a positive number" });
      }
      set.goal = goalNum;
    }

    if (Object.keys(set).length === 0) {
      return res.status(400).json({ error: "Bad Request: provide fields or toggleDate" });
    }

    set.updatedAt = new Date();

    const result = await habits.updateOne({ _id }, { $set: set });
    if (result.matchedCount === 0) return res.status(404).json({ error: "Not Found" });

    const updated = await habits.findOne({ _id });
    updated.goal = typeof updated.goal === "number" ? updated.goal : Number(updated.goal) || 0;
    updated.logs = Array.isArray(updated.logs) ? updated.logs : [];

    res.status(200).json(updated);
  } catch (err) {
    console.error("PUT /api/habits/:id error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/habits/:id
router.delete("/:id", async (req, res) => {
  try {
    const habits = getHabitsCollection();
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Bad Request: invalid id" });
    }

    const result = await habits.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Not Found" });

    res.status(200).json({ message: "Deleted" });
  } catch (err) {
    console.error("DELETE /api/habits/:id error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
