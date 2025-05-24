const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const Redis = require("ioredis");
const Redlock = require("redlock");
require("dotenv").config();

const uri = "mongodb://root:example@localhost:27017";
const dbName = "demo_caching";
const collectionName = "Users";
const PORT = 3000;

const app = express();
let db, collection;
const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
  password: process.env.REDIS_PASSWORD || undefined,
});
const redlock = new Redlock([redis], {
  retryCount: 20,
  retryDelay: 250, // ms
});

// Route for DB query only
app.get("/user/:id", async (req, res) => {
  try {
    const user = await collection.findOne({ _id: new ObjectId(req.params.id) });
    res.json({
      user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// New route: /user-cache/:id
app.get("/user-cache/:id", async (req, res) => {
  const userId = req.params.id;
  const redisKey = `user:${userId}:info`;
  const useRedlock = req.query.redlock === "true";
  try {
    let userData = await redis.get(redisKey);
    if (userData) {
      // Found in Redis
      res.json({ user: JSON.parse(userData), source: "redis", waited: false });
      return;
    }
    if (!useRedlock) {
      // No redlock, normal flow
      const user = await collection.findOne({ _id: new ObjectId(userId) });
      if (user) {
        await redis.set(redisKey, JSON.stringify(user));
      }
      res.json({ user, source: "mongodb" });
      return;
    }
    // Use redlock
    const lockKey = `lock:user:${userId}:info`;
    let lock;
    try {
      lock = await redlock.acquire([lockKey], 3000); // 3s TTL

      // Double-check cache after acquiring lock
      let userData = await redis.get(redisKey);
      if (userData) {
        await redlock.release(lock);
        res.json({
          user: JSON.parse(userData),
          source: "redis",
          waited: false,
        });
        return;
      }

      const user = await collection.findOne({ _id: new ObjectId(userId) });
      if (user) {
        await redis.set(redisKey, JSON.stringify(user));
      }
      await redlock.release(lock);
      res.json({ user, source: "mongodb", redlock: true });
    } catch (lockErr) {
      // If can't acquire lock, retry for cache with max attempts
      console.log("lockErr: ", lockErr);
      const userDataRetry = await waitForCache(redisKey, 5, 200);
      if (userDataRetry) {
        res.json({ user: userDataRetry, source: "redis", waited: true });
      } else {
        res
          .status(500)
          .json({ error: "Failed to acquire lock and no cache available." });
      }
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function for safer retry
async function waitForCache(redisKey, maxAttempts = 5, delay = 200) {
  for (let i = 0; i < maxAttempts; i++) {
    const userDataRetry = await redis.get(redisKey);
    if (userDataRetry) return JSON.parse(userDataRetry);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return null;
}

async function start() {
  const client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  collection = db.collection(collectionName);
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("GET /user/:id to query user by MongoDB _id");
    console.log("GET /user-cache/:id to query user by cache first");
    console.log("GET /user-cache/:id?redlock=true to use distributed lock");
  });
}

start();
