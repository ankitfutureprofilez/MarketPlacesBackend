const mongoose = require("mongoose");

const offerPriceSlabSchema = new mongoose.Schema(
  {
    minDiscount: {
      type: Number, // inclusive
      required: true,
    },
    maxDiscount: {
      type: Number, // exclusive
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const homeSchema = mongoose.Schema(
  {
    term_condition: {
      type: String,
      default: null,
    },
    privacy_policy: {
      type: String,
      default: null,
    },
    offers_price: {
      type: [offerPriceSlabSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("home", homeSchema);
