const express = require("express");
const {
  getFeaturedProperties,
  getPropertyById,
  getAgents,
  getAgentById,
  getTestimonials
} = require("../controllers/property.controller");

const router = express.Router();

router.get("/properties/featured", getFeaturedProperties);
router.get("/properties/:id", getPropertyById);
router.get("/agents", getAgents);
router.get("/agents/:id", getAgentById);
router.get("/testimonials", getTestimonials);

module.exports = router;
