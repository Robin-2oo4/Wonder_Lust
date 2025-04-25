if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const expressErrors = require("./utils/expressErrors.js");
// const mongo_url = "mongodb://127.0.0.1:27017/WONDER_LUST";
const Listing = require("./Routes/listing.js");
const reviews = require("./Routes/review.js");
const userRoutes = require("./Routes/user.js");
const session = require("express-session");
const MongoDBStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const User = require("./models/user.js");
const LocalStrategy = require("passport-local");

const dbUrl = process.env.ATLASDB_URL;

async function main() {
  await mongoose.connect(dbUrl);
}
main()
  .then(() => console.log("MongoDB Connected..."))
  .catch((err) => console.log(err));

app.listen(8080, () => {
  console.log("Server is running on port 8080");
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

const store = MongoDBStore.create({
  mongoUrl: dbUrl,
  crypto: {
    secret: process.env.SECRET,
  },
  touchAfter: 24 * 3600,
});

store.on("error", function (e) {
  console.log("Session store error", e);
});

const sessionOptions = {
  store: store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currentUser = req.user;
  next();
});

// app.get("/", (req, res) => {
//   res.send("working");
// });

//routes
app.use("/listings", Listing);
app.use("/listings/:id/reviews", reviews);
app.use("/", userRoutes);

// 404 error handling for undefined routes
app.use((req, res) => {
  res.status(404).render("error.ejs", { message: "Page not found!" });
});

// Catch-all route for undefined routes
app.all("*", (req, res, next) => {
  next(new expressErrors(404, "Page not found!"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  req.flash("error", "Something went wrong!");
  res.status(err.status || 500).render("error", { message: err.message });
});

app.use((req, res, next) => {
  console.log("Middleware executed");
  next();
});
// app.get('/listings', async(req, res) => {
//     let SampleListing = new Listing({
//         title: "Sample Listing",
//         description: "This is a sample listing",
//         price: 100,
//         location: "Sample Location",
//         country: "Sample Country",
//     });
//     await SampleListing.save();
//     res.send('listings');
//     });
