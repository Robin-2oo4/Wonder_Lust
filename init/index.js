const mongoose = require("mongoose");
const Listing = require("../models/Listing.js");
const initData = require("./data.js");

const mongo_url = "mongodb://127.0.0.1:27017/WONDER_LUST";

async function main() {
  await mongoose.connect(mongo_url);
}
main()
  .then(() => console.log("MongoDB Connected..."))
  .catch((err) => console.log(err));

const initDb = async () => {
  await Listing.deleteMany({});
  initData.data = initData.data.map((obj) => ({
    ...obj,
    owner: "6801ef7a365a36d7b9066303",
  }));
  await Listing.insertMany(initData.data);
  console.log("Data initialized");
};

initDb();
