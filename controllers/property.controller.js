const dotenv = require("dotenv");
const redis = require("../utils/redisClient");
const { Property, Agent, Testimonial } = require("../models/model");

dotenv.config();


exports.getFeaturedProperties = async (req, res, next) => {
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
}

// Property by Id
exports.getPropertyById = async (req, res, next) => {
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
};

// Agents endpoint

exports.getAgents = async (req, res, next) => {
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
};

// Agents by id

exports.getAgentById = async (req, res, next) => {
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
}

// Testimonials endpoint
exports.getTestimonials = async (req, res, next) => {
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
};


