const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models/model");

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(200).json({ message: "Login successful" });
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
    
        res.status(201).json({ message: "User registered successfully" });
      } catch (err) {
        res.status(500).json({ message: "Something went wrong" });
      }
}
 exports.getMe = async (req, res, next) => {
    const user = await User.findById(req.user.id).select("-password");
      res.json(user);
}
 exports.logout = async (req, res, next) => {
     res.clearCookie("token");
        res.status(200).json({ message: "Logout successful" });    
}
