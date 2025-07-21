const mongoose = require('mongoose');

const dotenv = require("dotenv");

dotenv.config()
const mongodbURI = process.env.MONGODB_URI;


const connectDB = async () => {
  try {
    await mongoose.connect(mongodbURI, {
      maxPoolSize: 10,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      waitQueueTimeoutMS: 30000,
    });
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1); 
  }
};

module.exports = connectDB;
