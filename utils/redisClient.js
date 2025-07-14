const Redis = require("ioredis");
require("dotenv").config();

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

  redis.on("connect", () => console.log("🔌 Redis connected"));
  redis.on("error", (err) => console.error("❌ Redis error:", err));

  global.redis = redis; 
} else {
  redis = global.redis;
}

module.exports = redis;
