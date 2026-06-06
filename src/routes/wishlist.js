const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth");
const wishlistController = require("../controllers/wishlist");

// All wishlist routes require authentication
router.use(authenticate);

// GET /api/wishlist - Get user's wishlist
router.get("/", wishlistController.getWishlist);

// POST /api/wishlist - Add product to wishlist
router.post("/", wishlistController.addToWishlist);

// DELETE /api/wishlist - Remove product from wishlist (or use DELETE /:productId)
router.delete("/", wishlistController.removeFromWishlist);

// GET /api/wishlist/check - Check if product is in wishlist
router.get("/check", wishlistController.isInWishlist);

// DELETE /api/wishlist/clear - Clear entire wishlist
router.delete("/clear", wishlistController.clearWishlist);

module.exports = router;
