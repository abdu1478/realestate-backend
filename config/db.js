const mongoose = require("mongoose");

const dotenv = require("dotenv");


dotenv.config({ path: '.env' });

const mongodbURI = process.env.MONGODB_URI 

if (!mongodbURI) {
  console.error("MONGODB_URI is not defined in environment variables.");
  process.exit(1);
}

mongoose.set("strictQuery", true);

const connectDB = async () => {
  try {
    await mongoose.connect(mongodbURI, {
      maxPoolSize: 10,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 60000,
      serverSelectionTimeoutMS: 60000,
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

module.exports = connectDB;
