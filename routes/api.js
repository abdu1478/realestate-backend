const express = require("express");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const redis = require("../utils/redisClient");
const auth = require("../middleware/auth");

const rateLimiter = require("express-rate-limit", {
  windowMs: 15 * 60 * 1000,
  max: 100, 
})

const {
  Property,
  Agent,
  Testimonial,
  User,
  UserMessage,
} = require("../models/model");
dotenv.config();


const router = express.Router();


// Favourites management routes
router.post("/users/:userId/favourites", auth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { propertyId } = req.body;

    const cacheKey = `user:${userId}:favourites`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      const cachedFavourites = JSON.parse(cached);
      if (cachedFavourites.includes(propertyId)) {
        res.status(400).json({ message: "Property already in favourites" });
        return;
      }
    }

    if (req.user.id.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to modify favourites" });
    }

    const property = await Property.findById(propertyId);

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    const user = await User.findById(userId);

    if (user.favourites.includes(propertyId)) {
      return res
        .status(400)
        .json({ message: "Property already in favourites" });
    }

    await redis.set(
      cacheKey,
      JSON.stringify([...user.favourites, propertyId]),
      "EX",
      400
    );
    user.favourites.push(propertyId);
    await user.save();

    res.status(200).json({
      message: "Property added to favourites",
      favourites: user.favourites,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.delete(
  "/users/:userId/favourites/:propertyId",
  auth,
  async (req, res, next) => {
    try {
      const { userId, propertyId } = req.params;
      const cacheKey = `user:${userId}:favourites`;

      if (req.user.id.toString() !== userId) {
        return res
          .status(403)
          .json({ message: "Unauthorized to modify favourites" });
      }

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (!user.favourites.includes(propertyId)) {
        return res.status(400).json({ message: "Property not in favourites" });
      }

      user.favourites = user.favourites.filter(
        (id) => id.toString() !== propertyId
      );
      await user.save();

      await redis.set(cacheKey, JSON.stringify(user.favourites), "EX", 400);

      res.status(200).json({ message: "Property removed from favourites" });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
);

// Get user's favorites
router.get("/users/:userId/favourites", auth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const cacheKey = `user:${userId}:favourites`;

    if (req.user.id.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to view favourites" });
    }

    const cached = await redis.get(cacheKey);
    if (cached) {
      res.status(200).json(JSON.parse(cached));
      return;
    }

    const user = await User.findById(userId).populate("favourites");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await redis.set(cacheKey, JSON.stringify(user.favourites), "EX", 400);

    res.status(200).json(user.favourites);
  } catch (error) {
    console.error(error);
    next(error);
  }
});



router.get("/properties/featured", async (req, res, next) => {
  try {
    const cacheKey = "featuredProperties";

    const cached = await redis.get(cacheKey);
    if (cached) {
      res.set("Cache-Control", "public, max-age=300").json(JSON.parse(cached));
      return;
    }

    const data = await Property.find().limit(4);

    await redis.set(cacheKey, JSON.stringify(data), "EX", 400);

    res.set("Cache-Control", "public, max-age=300").json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/agents", async (req, res, next) => {
  try {
    const cacheKey = "agentsList";
    const cached = await redis.get(cacheKey);

    if (cached) {
      res.set("Cache-Control", "public, max-age=300").json(JSON.parse(cached));
      return;
    }

    const data = await Agent.find().limit(5);

    await redis.set(cacheKey, JSON.stringify(data), "EX", 400);
    res.set("Cache-Control", "public, max-age=300").json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/testimonials", async (req, res, next) => {
  try {
    const cacheKey = "testimonialsList";
    const cached = await redis.get(cacheKey);

    if (cached) {
      res.set("Cache-Control", "public, max-age=300").json(JSON.parse(cached));
      return;
    }
    const data = await Testimonial.find().limit(3);

    await redis.set(cacheKey, JSON.stringify(data), "EX", 400);

    res.set("Cache-Control", "public, max-age=300").json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/properties/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const cacheKey = `property:${id}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      res
        .status(200)
        .set("Cache-Control", "public, max-age=300")
        .json(JSON.parse(cached));
      return;
    }
    const property = await Property.findById(id);
    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    await redis.set(cacheKey, JSON.stringify(property), "EX", 400);
    res.status(200).set("Cache-Control", "public, max-age=300").json(property);
  } catch (error) {
    next(error);
  }
});

router.get("/agents/:id", async (req, res, next) => {
  try {
    const cacheKey = `agents:${req.params.id}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      res.json(JSON.parse(cached));
    }

    const agent = await Agent.findById(req.params.id).select("-__v").lean();

    if (!agent) {
      res.status(404).json({ message: "Not found" });
      return;
    }

    await redis.set(cacheKey, JSON.stringify(agent), "EX", 600);

    res.json(agent);
  } catch (error) {
    next(error);
  }
});

router.post("/contact", async (req, res, next) => {
  try {
    const { fullName, email, phone, message, propertyId, sourcePage } =
      req.body;

    // Create new message document
    const userMessage = new UserMessage({
      fullName,
      email,
      phone,
      message,
      subject: req.body.subject || "General Inquiry",
      sourcePage: sourcePage || "Contact Us Page",
      propertyId: propertyId || null,
      userId: req.user?.id || null,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    await userMessage.save();

    res.status(201).json({
      success: true,
      message: "Message submitted successfully",
      data: userMessage,
    });
    console.log(
      "Message submitted successfully:",
      req.headers["user-agent"],
      req.ip
    );
  } catch (error) {
    console.error("Error submitting message:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to submit message",
    });
  }
});

router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

module.exports = router;
