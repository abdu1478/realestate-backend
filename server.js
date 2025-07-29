const express = require("express");
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
const FRONTEND_URL = process.env.FRONTEND_URL;

// === Normalize and configure allowed origins ===
const normalizeUrl = url => url ? url.replace(/\/$/, '') : url; // Remove trailing slashes

const allowedOrigins = [
  FRONTEND_URL,
  'https://nova-properties-rho.vercel.app', // Add the missing origin
  'http://localhost:3000' // Keep local development
].map(normalizeUrl).filter(Boolean); // Remove empty values

console.log("Allowed CORS origins:", allowedOrigins);

// === Middleware ===
app.use(cors({    
  origin: function (origin, callback) {
    console.log("Incoming request origin:", origin);
    
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(normalizeUrl(origin))) {
      return callback(null, true);
    } else {
      console.warn("Blocked by CORS:", origin);
      return callback(new Error("CORS policy does not allow this origin"));
    }
  },
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(cookieParser());
app.use(express.json());
// app.use(compression({ level: 6, threshold: "5kb" }));

// === Rate Limiting ===
app.use(rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 2000,
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
