const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models/model");
const path = require("path");

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
};

const signAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
};

const signRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, passwordUpdatedAt: user.passwordUpdatedAt },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
};

// ===== AUTH CONTROLLERS =====
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: "Registered successfully" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;


  try {
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log(`User with ${email} attempting to login`)

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.cookie("access_token", accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 3 * 24 * 60 * 60 * 1000, 
    });

    res.cookie("refresh_token", refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    console.log(`User with ${email} logged in successfully`)


    res.status(200).json({ message: "Login successful" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.refreshToken = async (req, res) => {
  const token = req.cookies.refresh_token;

  if (!token) {
    return res.status(401).json({ message: "Refresh token missing", code: "NO_TOKEN" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id).select("role passwordUpdatedAt");
    if (!user) {
      return res.status(401).json({ message: "User no longer exists", code: "INVALID_USER" });
    }

    if (decoded.passwordUpdatedAt && decoded.passwordUpdatedAt < user.passwordUpdatedAt.getTime()) {
      return res.status(401).json({ message: "Password recently changed", code: "PASSWORD_CHANGED" });
    }

    const newAccessToken = signAccessToken(user);

    res.cookie("access_token", newAccessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    return res.status(200).json({ message: "Access token refreshed" });
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Refresh token expired", code: "TOKEN_EXPIRED" });
    }

    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Invalid token", code: "INVALID_TOKEN" });
    }

    console.error("Refresh token error:", err);
    return res.status(500).json({ message: "Token refresh failed", code: "SERVER_ERROR" });
  }
};

exports.getMe = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("GetMe error:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

exports.logout = (req, res) => {
  res.clearCookie("access_token", COOKIE_OPTIONS);
  res.clearCookie("refresh_token", COOKIE_OPTIONS);

  res.status(200).json({ message: "Logout successful" });
};
