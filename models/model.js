const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Schema = mongoose.Schema;

// Property Schema
const PropertySchema = new Schema({
  image: { type: String, required: true },
  price: { type: String, required: true },
  location: { type: String, required: true },
  bedrooms: { type: Number, required: true },
  bathrooms: { type: Number, required: true },
  area: { type: String, required: true },
  type: { type: String, required: true },
  yearBuilt: { type: Number, required: true },
  description: String,
  features: [String],
  address: String,
  category: { type: String, enum: ["Buy", "Rent"] },
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: "Agent" },
  parking: {
    type: String,
    enum: ["Available", "Not Available"],
    default: "Available",
  },
  propertyType: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Agent Schema
const AgentSchema = new Schema({
  name: String,
  title: String,
  experience: String,
  languages: [String],
  phone: String,
  email: String,
  image: String,
});

// Testimonial Schema
const TestimonialSchema = new Schema({
  name: String,
  location: String,
  testimonial: String,
  rating: Number,
});

// User Schema
const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please add a valid email"
    ]
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },
  favourites: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      default: [],
    },
  ],
  refreshToken: { type: String, select: false }
});

// User message Schema
const UserMessageSchema = new Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  message: { type: String, required: true },
  subject: {type: String, required: true},
  status: { type: String, default: "New" },
  sourcePage: {type: String, default: "Contact Us Page"},
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" }, 
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
  createdAt: { type: Date, default: Date.now },
  ipAddress: { type: String },
  userAgent: { type: String }
});

// User Schema Hooks and Methods
UserSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Models
const Property = mongoose.model("Property", PropertySchema);
const Agent = mongoose.model("Agent", AgentSchema);
const Testimonial = mongoose.model("Testimonial", TestimonialSchema);
const User = mongoose.model("User", UserSchema);
const UserMessage = mongoose.model("UserMessage", UserMessageSchema);

// Export models
module.exports = {
  Property,
  Agent,
  Testimonial,
  User,
  UserMessage,
};