const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors"); 
const path = require("path");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const dotenv = require("dotenv");


dotenv.config({ path: '.env' });

connectDB()

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/realestate";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// === Middleware ===
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(cookieParser());
app.use(express.json());
// app.use(compression({ level: 6, threshold: "5kb" }));

// === Rate Limiting ===
app.use(rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 300,
}));

// === Static File Serving ===
const staticOptions = {
  maxAge: "30d",
  setHeaders: (res) => {
    res.set("Cache-Control", "public, max-age=2592000");
  },
};
app.use("/images", express.static(path.join(__dirname, "public/images"), staticOptions));
app.use("/images/agents", express.static(path.join(__dirname, "public/images/agents"), staticOptions));

// === Response Time Debug (optional logging) ===
app.use((req, res, next) => {
  const start = process.hrtime();
  res.on("finish", () => {
    const [sec, nano] = process.hrtime(start);
    const ms = (sec * 1000 + nano / 1e6).toFixed(2);
    // console.log(`${req.method} ${req.originalUrl} - ${ms}ms`);
  });
  next();
});


// === API Routes ===
app.use("/api", require("./routes/auth.routes"));
app.use("/api", require("./routes/user.routes"));
app.use("/api", require("./routes/property.routes"));
app.use("/api", require("./routes/contact.routes"));


app.set("etag", "strong");

// Server Start
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
