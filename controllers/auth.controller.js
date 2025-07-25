const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models/model");
const path = require("path");

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log(`Login attempt for email: ${email}`);
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3 * 24 * 60 * 60 * 1000,
      sameSite: "None",
      secure: true,
    });
    res.status(200).json({ message: "Login successful" });
    console.log(`User ${user.email} logged in successfully`);
  } catch (err) {
    next(err);
  }
};

// Add other functions: 
exports.register = async (req, res, next) => {
    const { name, email, password } = req.body;
      try {
        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ message: "Email already registered" });
    
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword });
        await user.save();
    
        res.status(201).json({ message: "Registered successfully" });
      } catch (err) {
        res.status(500).json({ message: "Something went wrong" });
      }
}


 exports.getMe = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
      const user = await User.findById(req.user.id).select("-password");
        res.json(user);
  }catch (error) {
    next(error);
  }
}

exports.resetPasswordController = async (req, res, next) => {
  console.log("User is tryig to reset password")
}

exports.logout = async (req, res, next) => {
    const token = req.cookies.token;
    if(token) {
      console.log(true)
    }

    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        // domain: process.env.NODE_ENV === "production" ? ".yourdomain.com" : "localhost"
      });

      res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
    res.status(200).json({ message: "Logout successful" });
}

