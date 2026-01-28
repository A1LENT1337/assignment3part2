// app.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const { connectDB } = require("./database/db");
const habitsRoutes = require("./routes/habits");

const app = express();
const PORT = process.env.PORT || 3000;

// JSON middleware
app.use(express.json());

// Custom logger
app.use((req, res, next) => {
  const time = new Date().toISOString();
  console.log(`[${time}] ${req.method}: ${req.url}`);
  next();
});

// Static frontend
app.use(express.static(path.join(__dirname, "public")));

// Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API routes
app.use("/api/habits", habitsRoutes);

// Global API 404
app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found" });
});

// Start server after DB
(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
  }
})();
