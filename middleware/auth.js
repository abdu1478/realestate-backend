
<<<<<<< HEAD
const authenticateSupabase = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.decode(token); 
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authenticateSupabase;
=======
const { User }       = require("../models/model");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  
);

exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

    if (error || !supabaseUser) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const mongoUser = await User.findOneAndUpdate(
      { supabaseId: supabaseUser.id },
      {
        $setOnInsert: {
          supabaseId: supabaseUser.id,
          email:      supabaseUser.email,
          name:       supabaseUser.user_metadata?.full_name ?? "",
        },
      },
      { upsert: true, new: true }
    );

    req.user         = mongoUser;  
    req.supabaseUser = supabaseUser;
    
    

    next();
  } catch (error) {
    next(error);
  }
};

>>>>>>> c3741ee (Added supabase for auth and refactored the server)
