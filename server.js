const express      = require("express");
const cors         = require("cors");
const path         = require("path");
const compression  = require("compression");
const rateLimit    = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const helmet       = require("helmet");
const connectDB    = require("./config/db");
const dotenv       = require("dotenv");

dotenv.config({ path: ".env" });

const app          = express();
const PORT         = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL;

// URL normaliser
const normalizeUrl = (url) => (url ? url.replace(/\/$/, "") : url);

const allowedOrigins = [
  FRONTEND_URL,
  "https://nova-properties-rho.vercel.app",
  "http://localhost:5173",
].map(normalizeUrl).filter(Boolean);

// App config 
app.set("etag", "strong");   
app.set("trust proxy", 1);   


// Security headers 
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // allow image serving
}));

// CORS 
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true); 
    if (allowedOrigins.includes(normalizeUrl(origin))) {
      return callback(null, true);
    }
    console.warn("Blocked by CORS:", origin);
    return callback(new Error("CORS policy does not allow this origin"));
  },
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// cookie parsing 
app.use(cookieParser());
app.use(express.json({ limit: "10kb" })); 


app.use(compression({ level: 6, threshold: "5kb" }));

// Rate limiting 
const generalLimiter = rateLimit({
  windowMs: 60_000,  
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

// Tighter limit for auth routes 
const authLimiter = rateLimit({
  windowMs: 15 * 60_000,  
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please try again later." },
});

app.use("/api/", generalLimiter);
app.use("/api/auth/", authLimiter);

// Static files 
const staticOptions = {
  maxAge: "1y",
  immutable: true,
  setHeaders(res) {
    res.set("Cache-Control", "public, max-age=2592000, immutable");
  },
};
app.use("/images", express.static(path.join(__dirname, "public/images"), staticOptions));

// Response time logger 
app.use((req, res, next) => {
  const start = process.hrtime();
  res.on("finish", () => {
    const [sec, nano] = process.hrtime(start);
    const ms = (sec * 1000 + nano / 1e6).toFixed(2);
    console.log(`${req.method} ${req.path} ${res.statusCode} — ${ms}ms`);
  });
  next();
});

// API Routes
app.use("/api", require("./routes/auth.routes"));
app.use("/api", require("./routes/user.routes"));
app.use("/api", require("./routes/property.routes"));
app.use("/api", require("./routes/contact.routes"));

// 404 handler 
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  const status  = err.status ?? err.statusCode ?? 500;
  const message = status === 500 ? "Internal server error" : err.message;

  if (status === 500) {
    console.error(`[${new Date().toISOString()}] Unhandled error:`, err);
  }

  res.status(status).json({ error: message });
});

const startServer = async () => {
  try {
    await connectDB();                          
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();