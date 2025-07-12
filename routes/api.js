const express = require("express");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { Property, Agent, Testimonial, User } = require("../models/model");

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

const auth = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized to access this route" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select(
      "-password -refreshToken"
    );

    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

router.post("/auth/signup", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
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

router.post("/auth/signin", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const accessToken = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    user.refreshToken = refreshToken;
    await user.save();

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

router.post("/auth/refresh-token", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({ message: "Refresh token required" });
      return;
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const user = await User.findById(decoded.id).select("+refreshToken");

    if (!user || user.refreshToken !== refreshToken) {
      res.status(401).json({ message: "Invalid refresh token" });
      return;
    }

    const newAccessToken = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    res.status(200).json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/auth/me", auth, async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }
    res
      .status(200)
      .set("Cache-Control", "public, max-age=300")
      .json(req.user);
  } catch (error) {
    next(error);
  }
});

router.get("/properties/featured", async (req, res, next) => {
  try {
    const data = await Property.find().limit(4);
    res.set("Cache-Control", "public, max-age=300").json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/agents", async (req, res, next) => {
  try {
    const data = await Agent.find().limit(5);
    res.set("Cache-Control", "public, max-age=300").json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/testimonials", async (req, res, next) => {
  try {
    const data = await Testimonial.find().limit(3);
    res.set("Cache-Control", "public, max-age=300").json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/properties/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const property = await Property.findById(id);
    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }
    res
      .status(200)
      .set("Cache-Control", "public, max-age=300")
      .json(property);
  } catch (error) {
    next(error);
  }
});

router.get("/agents/:id", async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.params.id)
      .select("-__v -createdAt -updatedAt")
      .maxTimeMS(2000)
      .lean();

    if (!agent) {
      res.status(404).json({ message: "Not found" });
      return;
    }

    res.set("Cache-Control", "public, max-age=600");
    res.json(agent);
  } catch (error) {
    next(error);
  }
});

// Error handling
router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

module.exports = router;