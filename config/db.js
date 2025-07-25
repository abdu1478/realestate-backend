const mongoose = require('mongoose');

const dotenv = require("dotenv");

dotenv.config()
const mongodbURI = process.env.MONGODB_URI || "mongodb://localhost:27017/realestate";

(() => {
  console.log(`connecting to MongoDB at ${mongodbURI}`);
},  1000)

if (!mongodbURI) {
  console.error("MONGODB_URI is not defined in the environment variables.");
  process.exit(1);
} 



const connectDB = async () => {
  try {
    await mongoose.connect(mongodbURI, {
      maxPoolSize: 10,
      socketTimeoutMS: 55000,
      connectTimeoutMS: 40000,
      waitQueueTimeoutMS: 40000,
    });
    console.log('MongoDB Connected', mongodbURI);
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1); 
  }
};

module.exports = connectDB;
