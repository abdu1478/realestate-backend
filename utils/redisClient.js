const { createClient } = require("redis");

const redis = createClient({ url: "redis://localhost:6379" });

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

(async () => {
  try {
    await redis.connect();
    console.log("🔌 Redis connected");
  } catch (err) {
    console.error("Redis connection failed:", err);
  }
})();

module.exports = redis;
