const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models/model");

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

const COOKIE_OPTIONS = {
  httpOnly: true, 
  secure: process.env.NODE_ENV === "production", 
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", 
  path: "/", 
}

const signAccessToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });

const signRefreshToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role,
      passwordUpdatedAt: user.passwordUpdatedAt?.getTime() || Date.now(),
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

// REGISTER
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
    console.error("Register error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// LOGIN
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select("+password");

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!user || !passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.cookie("access_token", accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refresh_token", refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ message: "Login successful" });
    } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// REFRESH TOKEN
exports.refreshToken = async (req, res) => {
  const token = req.cookies.refresh_token;

  if (!token) {
    return res.status(401).json({ message: "Refresh token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select("role passwordUpdatedAt");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const tokenIssueTime = decoded.passwordUpdatedAt || 0;
    const latestChange = user.passwordUpdatedAt?.getTime() || 0;

    if (tokenIssueTime < latestChange) {
      return res.status(401).json({ message: "Password recently changed" });
    }

    const newAccessToken = signAccessToken(user);
    res.cookie("access_token", newAccessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({ message: "Access token refreshed" });
  } catch (err) {
    console.error("Refresh token error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// GET CURRENT USER
exports.getMe = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("GetMe error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// LOGOUT
exports.logout = (req, res) => {
  res.clearCookie("access_token", COOKIE_OPTIONS);
  res.clearCookie("refresh_token", COOKIE_OPTIONS);
  res.status(200).json({ message: "Logout successful" });
};
