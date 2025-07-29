const express = require("express");
const { addFavourite, removeFavourite, getFavourites } = require("../controllers/user.controller");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/users/:userId/favourites", auth, addFavourite);
router.delete("/users/:userId/favourites/:propertyId", auth, removeFavourite);
router.get("/users/:userId/favourites", auth, getFavourites);

module.exports = router;
