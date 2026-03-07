const redis    = require("../utils/redisClient");
const { Property, User } = require("../models/model");
const mongoose = require("mongoose");

// Helpers

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);


async function cacheGet(key) {
  try { return await redis.get(key); }
  catch { return null; }
}
async function cacheSet(key, value, ttl = 400) {
  try { await redis.set(key, JSON.stringify(value), "EX", ttl); }
  catch { /* non-fatal */ }
}

// Add Favourite 
exports.addFavourite = async (req, res, next) => {
  try {
    const { propertyId } = req.body;

    if (!propertyId) {
      return res.status(400).json({ message: "propertyId is required" });
    }

    if (!isValidObjectId(propertyId)) {
      return res.status(400).json({ message: "Invalid propertyId format" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { favourites: propertyId } }, 
      { new: true }
    ).populate("favourites");        

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    
    await cacheSet(`user:${req.user._id}:favourites`, user.favourites);

    return res.status(200).json({
      message: "Property added to favourites",
      favourites: user.favourites,
    });
  } catch (error) {
    next(error);
  }
};

// Remove Favourite 
exports.removeFavourite = async (req, res, next) => {
  try {
    const { propertyId } = req.params;

    if (!isValidObjectId(propertyId)) {
      return res.status(400).json({ message: "Invalid propertyId format" });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { favourites: propertyId } }, 
      { new: true }
    ).populate("favourites");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await cacheSet(`user:${req.user._id}:favourites`, user.favourites);

    return res.status(200).json({
      message: "Property removed from favourites",
      favourites: user.favourites,
    });
  } catch (error) {
    next(error);
  }
};

// Get Favourites 
exports.getFavourites = async (req, res, next) => {
  try {
    
    const cacheKey = `user:${req.user._id}:favourites`;

    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const user = await User.findById(req.user._id)
      .populate("favourites")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await cacheSet(cacheKey, user.favourites);

    return res.status(200).json(user.favourites ?? []);
  } catch (error) {
    next(error);
  }
};