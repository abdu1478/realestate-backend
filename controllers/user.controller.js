const dotenv = require("dotenv");
const redis = require("../utils/redisClient");
const { Property, User } = require("../models/model");

dotenv.config();

exports.addFavourite = async (req, res, next) => {
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
}

exports.removeFavourite = async (req, res, next) => {
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
exports.getFavourites = async (req, res, next) => {
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
};