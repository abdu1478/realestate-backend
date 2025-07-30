const redis = require("../utils/redisClient");
const { Property, Agent, Testimonial } = require("../models/model");


// Fetch properties 
exports.getAllProperties = async (req, res, next) => {
  try {
    const { page = 1, limit = 14 } = req.query;
    const cacheKey = `properties:page=${page}&limit=${limit}`;
    const skip = (page - 1) * limit;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res
        .set("Cache-Control", "public, max-age=300")
        .json(JSON.parse(cached));
    }

    const data = await Property.find().lean();
    const total = data.length;

    await redis.set(cacheKey, JSON.stringify({ data, total }), "EX", 400);

    return res
      .set("Cache-Control", "public, max-age=300")
      .json({ data, total });
  } catch (error) {
    next(error);
  }
};



exports.getFeaturedProperties = async (req, res, next) => {
  try {
    const cacheKey = "featuredProperties";

    const cached = await redis.get(cacheKey);
    if (cached) {
      res.set("Cache-Control", "public, max-age=300").json(JSON.parse(cached));
      return;
    }

    const data = await Property.find().limit(3);

    await redis.set(cacheKey, JSON.stringify(data), "EX", 400);

    return res.set("Cache-Control", "public, max-age=300").json(data);
  } catch (error) {
    next(error);
  }
}

// Property by Id
exports.getPropertyById = async (req, res, next) => {
  const { id } = req.params;

   if (!id || id.length !== 24) {
  return res.status(400).json({ error: "Invalid or missing property ID" });
}
  try {
    
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
    return res.status(200).set("Cache-Control", "public, max-age=300").json(property);
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
    return res.set("Cache-Control", "public, max-age=300").json(data);
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
      return
    }

    const agent = await Agent.findById(req.params.id).select("-__v").lean();

    if (!agent) {
      res.status(404).json({ message: "Not found" });
      return;
    }

    await redis.set(cacheKey, JSON.stringify(agent), "EX", 600);

    return res.json(agent);
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

    return res.set("Cache-Control", "public, max-age=300").json(data);
  } catch (error) {
    next(error);
  }
};


