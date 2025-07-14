const express = require("express");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const redis = require("../utils/redisClient");

const { Property, Agent, Testimonial, User, UserMessage } = require("../models/model");
dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

// Authentication middleware
const auth = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  
  if (!token) {
    return res.status(401).json({ message: "Not authorized to access this route" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select(
      "-password -refreshToken"
    );
    
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

// Signup route
router.post("/auth/signup", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    
    const user = await User.create({ name, email, password });
    
    const accessToken = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
    const refreshToken = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });
    
    user.refreshToken = refreshToken;
    await user.save();
    
    // Set cookies first
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    // Send JSON response last
    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Signin route
router.post("/auth/signin", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    const accessToken = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
    const refreshToken = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });
    
    user.refreshToken = refreshToken;
    await user.save();
    
    // Set cookies first
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    // Send JSON response last
    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user._id },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

// Token refresh route
router.post("/auth/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }
    
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        message: "Invalid refresh token",
        error: err.name,
      });
    }
    
    // Moved inside try-catch to access decoded safely
    const user = await User.findById(decoded.userId).select("+refreshToken");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
    
    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    
    // Update user's refresh token
    user.refreshToken = newRefreshToken;
    await user.save();
    
    // Return new tokens in response
    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
});

// Logout route
router.post("/auth/logout", auth, async (req, res, next) => {
  try {
    const user = req.user;
    user.refreshToken = undefined; // Invalidate refresh token
    await user.save();
    
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    
    res.status(200).json({ message: "Successfully logged out" });
  } catch (error) {
    next(error);
  }
});

// Favourites management routes
router.post("/users/:userId/favourites", auth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { propertyId } = req.body;
    
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized to modify favourites" });
    }
    
    const property = await Property.findById(propertyId);
    
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    
    const user = await User.findById(userId);
    
    if (user.favourites.includes(propertyId)) {
      return res.status(400).json({ message: "Property already in favourites" });
    }
    
    user.favourites.push(propertyId);
    await user.save();
    
    res.status(200).json({
      message: "Property added to favourites",
      favourites: user.favourites,
    });
  } catch (error) {
    console.error(error)
    next(error);
  }
});

router.delete("/users/:userId/favourites/:propertyId", auth, async (req, res, next) => {
  try {
    const { userId, propertyId } = req.params;
    
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized to modify favourites" });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (!user.favourites.includes(propertyId)) {
      return res.status(400).json({ message: "Property not in favourites" });
    }
    
    user.favourites = user.favourites.filter(
      (id) => id.toString() !== propertyId
    );
    
    await user.save();
    
    res.status(200).json({ message: "Property removed from favourites" });
  } catch (error) {
    console.error(error)
    next(error);
  }
});

// Get user's favorites
router.get("/users/:userId/favourites", auth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized to view favourites" });
    }
    
    const user = await User.findById(userId).populate("favourites");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(200).json(user.favourites);
  } catch (error) {
    console.error(error)
    next(error);
  }
});

// Current user info
router.get("/auth/me", auth, async (req, res, next) => {
  try {
    res.status(200).json({
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    });
  } catch (error) {
    next(error);
  }
});


router.get("/properties/featured", async (req, res, next) => {
  try {
    const cacheKey = "featuredProperties";

    const cached = await redis.get(cacheKey);
    if (cached) {
      res.set("Cache-Control", "public, max-age=300").json(JSON.parse(cached));
      return
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

    if(cached) {
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

    if(cached) {
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

    if(cached) {
      res.status(200).set("Cache-Control", "public, max-age=300").json(JSON.parse(cached));
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

    if(cached) {
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
    const { fullName, email, phone, message, propertyId, sourcePage } = req.body;
    
    // Create new message document
    const userMessage = new UserMessage({
      fullName,
      email,
      phone,
      message,
      subject: req.body.subject || "General Inquiry",
      sourcePage: sourcePage || "Contact Us Page",
      propertyId: propertyId || null,
      userId: req.user?._id || null, 
      ipAddress: req.ip, 
      userAgent: req.headers['user-agent'] 
    });

    await userMessage.save();

    res.status(201).json({
      success: true,
      message: "Message submitted successfully",
      data: userMessage
    });
    console.log("Message submitted successfully:", req.headers['user-agent'], req.ip);
  } catch (error) {
    console.error("Error submitting message:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to submit message"
    });
  }
});

router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

module.exports = router;
