const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const dotenv = require("dotenv");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");

// Load environment variables from .env file
dotenv.config({ path: ".env" });

const connectDB = require("./config/db");
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL;

// Define allowed origins for CORS
const allowedOrigins = [
  FRONTEND_URL,
  "https://nova-properties-rho.vercel.app", // fallback hardcoded (optional)
];

// Security middleware for HTTP headers
app.use(helmet({ contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false }));

// Enable gzip compression for responses
app.use(compression({ level: 6, threshold: "5kb" }));

// Parse cookies from incoming requests
app.use(cookieParser());

// Parse JSON bodies
app.use(express.json());

// Configure CORS for cross-origin requests
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.warn("Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Apply rate limiting to all requests
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.NODE_ENV === "production" ? 1000 : 2000, // Lower limit in production
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Serve static image assets with long-term caching
const staticOptions = {
  maxAge: "30d",
  setHeaders: (res) => {
    res.set("Cache-Control", "public, max-age=2592000");
  },
};
// app.use("/images", (req, res, next) => {
//   res.header("Access-Control-Allow-Origin", FRONTEND_URL);
//   res.header("Access-Control-Allow-Credentials", "true");
//   next();
// }, express.static(path.join(__dirname, "public/images"), staticOptions));

// app.use("/images/agents", (req, res, next) => {
//   res.header("Access-Control-Allow-Origin", FRONTEND_URL);
//   res.header("Access-Control-Allow-Credentials", "true");
//   next();
// }, express.static(path.join(__dirname, "public/images/agents"), staticOptions));

const allowedImageOrigins = [
  process.env.FRONTEND_URL,
  "https://nova-properties-rho.vercel.app",
];

const imageCorsMiddleware = (req, res, next) => {
  const origin = req.headers.origin || process.env.FRONTEND_URL;

  console.log(origin)

  if (origin && allowedImageOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
};

app.use("/images", imageCorsMiddleware, express.static(path.join(__dirname, "public/images"), staticOptions));


// Log response times in development mode
app.use((req, res, next) => {
  const start = process.hrtime();
  res.on("finish", () => {
    const [s, ns] = process.hrtime(start);
    const ms = (s * 1e3 + ns / 1e6).toFixed(1);
    if (process.env.NODE_ENV === "development") {
      console.log(`[${res.statusCode}] ${req.method} ${req.originalUrl} - ${ms}ms`);
    }
  });
  next();
});

// Register API route handlers
app.use("/api", require("./routes/auth.routes"));
app.use("/api", require("./routes/user.routes"));
app.use("/api", require("./routes/property.routes"));
app.use("/api", require("./routes/contact.routes"));

// Enable strong ETag headers for caching
app.set("etag", "strong");

// Global error handler for uncaught errors
app.use((err, req, res, next) => {
  console.error("Global Error:", err.message);
  res.status(500).json({ message: err.message || "Internal Server Error" });
});

// Start the HTTP server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
});
