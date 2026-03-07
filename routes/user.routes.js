const express = require("express");
const { addFavourite, removeFavourite, getFavourites } = require("../controllers/user.controller");
const { protect} = require("../middleware/auth");

const router = express.Router();


router.post("/users/favourites", protect, addFavourite);
router.delete("/users/favourites/:propertyId", protect, removeFavourite);
router.get("/users/favourites", protect, getFavourites);

module.exports = router;
