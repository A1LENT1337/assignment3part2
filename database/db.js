// database/db.js
const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "habit_tracker";

let client;
let db;
let habitsCollection;

async function connectDB() {
  if (db) return db; 

  client = new MongoClient(MONGODB_URI);
  await client.connect();

  db = client.db(DB_NAME);
  habitsCollection = db.collection("habits");

  console.log("Connected to MongoDB:", DB_NAME);
  console.log("Collection:", habitsCollection.collectionName);

  return db;
}

function getHabitsCollection() {
  if (!habitsCollection) {
    throw new Error("Database not initialized. Call connectDB first.");
  }
  return habitsCollection;
}

module.exports = { connectDB, getHabitsCollection };
