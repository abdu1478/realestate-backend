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
