const Listing = require("../models/Listing.js");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapToken = process.env.MAP_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapToken });
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports.index = async (req, res) => {
  console.log(req.flash("success"));
  const allListings = await Listing.find();
  res.render("listings/index.ejs", { allListings });
};

module.exports.new = (req, res) => {
  res.render("listings/new.ejs");
};

module.exports.create = async (req, res) => {
  const geoData = await geocoder
    .forwardGeocode({
      query: req.body.listing.location,
      limit: 1,
    })
    .send();

  const newListing = new Listing(req.body.listing);
  newListing.geometry = geoData.body.features[0].geometry; // Set geometry from geocoding result
  newListing.owner = req.user._id;
  if (typeof req.file !== "undefined") {
    let url = req.file.path;
    let filename = req.file.filename;
    newListing.image = { url, filename };
  }
  await newListing.save();
  req.flash("success", "Successfully created a new listing!");
  res.redirect(`/listings/${newListing._id}`);
};

module.exports.show = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({ path: "reviews", populate: { path: "author" } })
    .populate("owner");
  if (!listing) {
    req.flash("error", "Cannot find that listing!");
    return res.redirect("/listings");
  }
  res.render("listings/show.ejs", {
    listing,
    coordinates: listing.geometry.coordinates,
  });
};

module.exports.edit = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Cannot find that listing!");
    return res.redirect("/listings");
  }
  res.render("listings/edit.ejs", { listing });
};

module.exports.update = async (req, res) => {
  const { id } = req.params;
  await Listing.findByIdAndUpdate(id, { ...req.body.listing });
  if (typeof req.file !== "undefined") {
    let url = req.file.path;
    let filename = req.file.filename;
    await Listing.findByIdAndUpdate(id, { image: { url, filename } });
  }

  req.flash("success", "Successfully updated the listing!");
  res.redirect(`/listings/${id}`);
};

module.exports.delete = async (req, res) => {
  const { id } = req.params;
  await Listing.findByIdAndDelete(id);
  req.flash("success", "Successfully deleted the listing!");
  res.redirect("/listings");
};

module.exports.search = async (req, res) => {
  const { country } = req.query;
  try {
    const listings = await Listing.find({
      country: new RegExp(country, "i"),
    }).lean();
    const uniqueListings = Array.from(
      new Map(listings.map((item) => [item._id.toString(), item])).values()
    );
    res.render("listings/index", { allListings: uniqueListings });
  } catch (err) {
    req.flash("error", "Unable to perform search. Please try again.");
    res.redirect("/listings");
  }
};

module.exports.book = async (req, res) => {
  const { id } = req.params;
  try {
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Listing not found!");
      return res.redirect("/listings");
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: listing.title,
              description: listing.description,
            },
            unit_amount: listing.price * 100, // Convert to paise (1 INR = 100 paise)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.protocol}://${req.get(
        "host"
      )}/listings/${id}/success`,
      cancel_url: `${req.protocol}://${req.get("host")}/listings/${id}`,
    });
    res.redirect(303, session.url);
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong with the payment process.");
    res.redirect(`/listings/${id}`);
  }
};

module.exports.success = async (req, res) => {
  const { id } = req.params;
  try {
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Listing not found!");
      return res.redirect("/listings");
    }

    req.flash("success", "Payment successful! Your booking is confirmed.");
    res.redirect(`/listings/${id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong.");
    res.redirect("/listings");
  }
};
