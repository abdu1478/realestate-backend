const Redis = require("ioredis");
require("dotenv").config();
// const redisURL = process.env.REDIS_URL || "http://localhost:6379/"

if (!global.redis) {
  if (!process.env.REDIS_URL) {
    console.error("REDIS_URL is not defined in the environment variables.");
    process.exit(1);
  }

  redis = new Redis(process.env.REDIS_URL, {
    tls: {}, 
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
  });

  redis.on("connect", () => console.log("Redis connected"));
  redis.on("error", (err) => console.error("Redis error:", err));

  global.redis = redis; 
} else {
  redis = global.redis;
}

module.exports = redis;
