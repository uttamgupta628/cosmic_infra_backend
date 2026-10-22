const { createClient } = require("redis");

const DEFAULT_TTL = 300;

if (!process.env.REDIS_URL) {
  console.warn(
    "REDIS_URL is not set (is dotenv loaded before this file?). Caching is disabled."
  );
}

const redisClient = createClient({
  ...(process.env.REDIS_URL && { url: process.env.REDIS_URL }),
  socket: {
    // Keep retrying forever, backing off up to 5s, so cache recovers after outages
    reconnectStrategy: (retries) => Math.min(retries * 500, 5000),
  },
});

// -----------------------------------------------------
// Readable error logging (throttled so it can't flood)
// -----------------------------------------------------
let lastErrorLog = 0;

const describeError = (err) => {
  if (Array.isArray(err?.errors) && err.errors.length > 0) {
    return err.errors
      .map((e) => `${e.code || e.name}: ${e.message || `${e.address}:${e.port}`}`)
      .join(" | ");
  }
  return `${err?.code || err?.name || "Error"}: ${err?.message || "(no message)"}`;
};

redisClient.on("error", (err) => {
  const now = Date.now();
  if (now - lastErrorLog < 10000) return;
  lastErrorLog = now;
  console.error("Redis Error:", describeError(err));
});

redisClient.on("ready", () => console.log("Redis ready"));

// Non-blocking: don't hold up server startup if Redis is down.
// node-redis keeps reconnecting in the background after the first failure.
const connectRedis = () => {
  if (!process.env.REDIS_URL || redisClient.isOpen) return;

  redisClient.connect().catch((err) => {
    console.error("Redis initial connect failed:", describeError(err));
  });
};

// -----------------------------------------------------
// Safe cache helpers: never throw, no-op when Redis is down
// -----------------------------------------------------
const cacheGet = async (key) => {
  if (!redisClient.isReady) return null;
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    console.error("Cache get error:", describeError(err));
    return null;
  }
};

const cacheSet = async (key, data, ttlSeconds = DEFAULT_TTL) => {
  if (!redisClient.isReady) return;
  try {
    await redisClient.set(key, JSON.stringify(data), { EX: ttlSeconds });
  } catch (err) {
    console.error("Cache set error:", describeError(err));
  }
};

const cacheDel = async (keys) => {
  if (!redisClient.isReady) return;
  const list = (Array.isArray(keys) ? keys : [keys]).filter(Boolean);
  if (list.length === 0) return;
  try {
    await redisClient.del(list);
  } catch (err) {
    console.error("Cache del error:", describeError(err));
  }
};

// Uses SCAN (non-blocking) instead of KEYS
const cacheKeysByPattern = async (pattern) => {
  if (!redisClient.isReady) return [];
  const found = [];
  try {
    for await (const item of redisClient.scanIterator({
      MATCH: pattern,
      COUNT: 100,
    })) {
      // node-redis v4 yields a key, v5 yields an array of keys
      if (Array.isArray(item)) found.push(...item);
      else found.push(item);
    }
  } catch (err) {
    console.error("Cache scan error:", describeError(err));
  }
  return found;
};

module.exports = {
  redisClient,
  connectRedis,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheKeysByPattern,
};