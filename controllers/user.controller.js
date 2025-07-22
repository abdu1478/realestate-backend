const dotenv = require("dotenv");
const redis = require("../utils/redisClient");
const { Property, User } = require("../models/model");
const mongoose = require("mongoose");

dotenv.config();

// Helper: Auth check
const isAuthorized = (reqUserId, paramUserId) => reqUserId.toString() === paramUserId.toString();

// Helper: Validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Add to favourites
exports.addFavourite = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { propertyId } = req.body;

    // console.log("Request body:", req.body);

    if (!isAuthorized(req.user.id, userId)) {
      return res.status(403).json({ message: "Unauthorized to modify favourites" });
    }

    if (!isValidObjectId(propertyId)) {
      return res.status(400).json({ message: "Invalid propertyId format" });
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const alreadyFavourite = user.favourites.some(
      (id) => id.toString() === propertyId.toString()
    );

    if (alreadyFavourite) {
      return res.status(200).json({ message: "Already in favourites", favourites: user.favourites });
    }

    user.favourites.push(propertyId);
    await user.save();

    // 🧠 Optional: populate and return full list
    const populatedUser = await User.findById(userId).populate("favourites");

    const cacheKey = `user:${userId}:favourites`;
    await redis.set(cacheKey, JSON.stringify(populatedUser.favourites), "EX", 400);

    return res.status(200).json({
      message: "Property added to favourites",
      favourites: populatedUser.favourites,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

// ✅ Remove from favourites
exports.removeFavourite = async (req, res, next) => {
  try {
    const { userId, propertyId } = req.params;

    if (!isAuthorized(req.user.id, userId)) {
      return res.status(403).json({ message: "Unauthorized to modify favourites" });
    }

    if (!isValidObjectId(propertyId)) {
      return res.status(400).json({ message: "Invalid propertyId format" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const initialLength = user.favourites.length;
    user.favourites = user.favourites.filter(
      (id) => id.toString() !== propertyId.toString()
    );

    if (user.favourites.length === initialLength) {
      return res.status(200).json({ message: "Property was not in favourites" });
    }

    await user.save();

    const populatedUser = await User.findById(userId).populate("favourites");

    const cacheKey = `user:${userId}:favourites`;
    await redis.set(cacheKey, JSON.stringify(populatedUser.favourites), "EX", 400);

    return res.status(200).json({
      message: "Property removed from favourites",
      favourites: populatedUser.favourites,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

// ✅ Get all favourites
exports.getFavourites = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!isAuthorized(req.user.id, userId)) {
      return res.status(403).json({ message: "Unauthorized to view favourites" });
    }

    const cacheKey = `user:${userId}:favourites`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const user = await User.findById(userId).populate("favourites");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await redis.set(cacheKey, JSON.stringify(user.favourites), "EX", 400);

    return res.status(200).json(user.favourites);
  } catch (error) {
    console.error(error);
    next(error);
  }
};
