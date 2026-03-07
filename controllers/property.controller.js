const redis = require("../utils/redisClient");
const { Property, Agent, Testimonial } = require("../models/model");
const { isValidObjectId } = require("mongoose");


async function cacheGet(key) {
  try { return await redis.get(key); }
  catch { return null; }
}

async function cacheSet(key, value, ttl = 300) {
  try { await redis.set(key, JSON.stringify(value), "EX", ttl); }
  catch {/* we will throw everthing */}
}

function parsePagination(query) {
  const page  = Math.max(1, parseInt(query.page)  || 1);

  const limit = Math.min(50, parseInt(query.limit) || 14);
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
}


exports.getAllProperties = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const cacheKey = `properties:page=${page}&limit=${limit}`;

    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res
        .set("Cache-Control", "public, max-age=300")
        .json(JSON.parse(cached));
    }

    const [data, total] = await Promise.all([
      Property.find().skip(skip).limit(limit).lean(),
      Property.countDocuments(),
    ]);

    const payload = { data, total, page, limit };
    await cacheSet(cacheKey, payload, 300);

    return res
      .set("Cache-Control", "public, max-age=300")
      .json(payload);
  } catch (error) {
    next(error);
  }
};


exports.getFeaturedProperties = async (req, res, next) => {
  try {
    const cacheKey = "featuredProperties";

    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res
        .set("Cache-Control", "public, max-age=300")
        .json(JSON.parse(cached));
    }

    
    const data = await Property.find({ featured: true }).limit(3).lean();

    await cacheSet(cacheKey, data, 300);

    return res
      .set("Cache-Control", "public, max-age=300")
      .json(data);
  } catch (error) {
    next(error);
  }
};


exports.getPropertyById = async (req, res, next) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid property ID" });
  }

  try {
    const cacheKey = `property:${id}`;

    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res
        .status(200)
        .set("Cache-Control", "public, max-age=300")
        .json(JSON.parse(cached));
    }

    const property = await Property.findById(id).lean();
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    await cacheSet(cacheKey, property, 300);

    return res
      .status(200)
      .set("Cache-Control", "public, max-age=300")
      .json(property);
  } catch (error) {
    next(error);
  }
};




exports.getAgents = async (req, res, next) => {
  try {
    const cacheKey = "agentsList";

    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res
        .set("Cache-Control", "public, max-age=300")
        .json(JSON.parse(cached));
    }

    const data = await Agent.find().limit(5).lean();

    await cacheSet(cacheKey, data, 300);

    return res
      .set("Cache-Control", "public, max-age=300")
      .json(data);
  } catch (error) {
    next(error);
  }
};


exports.getAgentById = async (req, res, next) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid agent ID" });
  }

  try {
    const cacheKey = `agent:${id}`;

    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res
        .set("Cache-Control", "public, max-age=300")
        .json(JSON.parse(cached));
    }

    const agent = await Agent.findById(id).select("-__v").lean();
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    await cacheSet(cacheKey, agent, 600);

    return res
      .set("Cache-Control", "public, max-age=300")
      .json(agent);
  } catch (error) {
    next(error);
  }
};


exports.getTestimonials = async (req, res, next) => {
  try {
    const cacheKey = "testimonialsList";

    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res
        .set("Cache-Control", "public, max-age=300")
        .json(JSON.parse(cached));
    }

    const data = await Testimonial.find().limit(3).lean();

    await cacheSet(cacheKey, data, 300);

    return res
      .set("Cache-Control", "public, max-age=300")
      .json(data);
  } catch (error) {
    next(error);
  }
};