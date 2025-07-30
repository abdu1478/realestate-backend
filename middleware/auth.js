const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  const token = req.cookies.access_token; 
   if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
     console.error("JWT verification failed:", err.message);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
module.exports = authenticate