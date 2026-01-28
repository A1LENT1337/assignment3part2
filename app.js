// app.js
require("dotenv").config();

const express = require("express");
const path = require("path");

const { connectDB } = require("./database/db");
const habitsRoutes = require("./routes/habits");

const app = express();
const PORT = process.env.PORT || 3000;

/* =====================
   Middleware
===================== */

// JSON body parser
app.use(express.json());

// Custom logger middleware
app.use((req, res, next) => {
  const time = new Date().toISOString();
  console.log(`[${time}] ${req.method}: ${req.url}`);
  next();
});

/* =====================
   Static frontend
===================== */

app.use(express.static(path.join(__dirname, "public")));

// Root UI
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* =====================
   API routes
===================== */

app.use("/api/habits", habitsRoutes);

// Global API 404 handler
app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found" });
});

/* =====================
   Start server AFTER DB
===================== */

(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
