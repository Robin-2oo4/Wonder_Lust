const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const expressErrors = require("../utils/expressErrors.js");
const { listingSchema } = require("../schema.js");
const methodOverride = require("method-override");
const { isLoggedIn, isOwner } = require("../middleware.js");
const listingController = require("../controllers/listing.js");
const multer = require("multer");
const { cloudinary, storage } = require("../cloudConfig.js");
const upload = multer({ storage: storage });

router.use(methodOverride("_method"));

router.use(express.urlencoded({ extended: true }));
// Validator
const validateListing = (req, res, next) => {
  const { error } = listingSchema.validate(req.body);
  if (error) {
    const message = error.details.map((el) => el.message).join(",");
    throw new expressErrors(400, message);
  } else {
    next();
  }
};

// Index route
router.get("/", wrapAsync(listingController.index));

// Search Route
router.get("/search", listingController.search);

// New route
router.get("/new", isLoggedIn, listingController.new);

// Create route
router.post(
  "/",
  isLoggedIn,
  upload.single("listing[image]"),
  validateListing,
  wrapAsync(listingController.create)
);

// Show route
router.get("/:id", wrapAsync(listingController.show));

// Edit route
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.edit));

// Update route
router.put(
  "/:id",
  isLoggedIn,
  isOwner,
  upload.single("listing[image]"),
  validateListing,
  wrapAsync(listingController.update)
);

// Delete route
router.delete("/:id", isLoggedIn, isOwner, wrapAsync(listingController.delete));

//Booking route
router.post("/:id/book", isLoggedIn, wrapAsync(listingController.book));

// Booking confirmation route
router.get("/:id/success", isLoggedIn, wrapAsync(listingController.success));

module.exports = router;
