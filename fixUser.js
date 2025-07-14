import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "./models/User.js"; // Adjust the path to your User model

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/realestate";

const fixUsers = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    const result = await User.updateMany(
      { favourites: { $exists: false } },
      { $set: { favourites: [] } }
    );
    console.log(`✅ Updated ${result.modifiedCount} users`);
    mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error updating users:", error);
  }
};

fixUsers();
