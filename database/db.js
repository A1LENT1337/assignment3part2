// database/db.js
const { MongoClient } = require("mongodb");

let client;
let habits;

async function connectDB() {
  if (habits) return habits;

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI is missing in environment variables");

  const dbName = process.env.DB_NAME || "habit_tracker";

  client = new MongoClient(uri);
  await client.connect();

  const db = client.db(dbName);
  habits = db.collection("habits");

  console.log("Connected to MongoDB:", dbName);
  console.log("Collection: habits");

  return habits;
}

function getHabitsCollection() {
  if (!habits) throw new Error("DB not initialized. Call connectDB() first.");
  return habits;
}

module.exports = { connectDB, getHabitsCollection };
