const mongoose = require("mongoose");

const OfferBuySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    offer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    payment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
    discount: {
      type: Number,
      default: null,
    },
    total_amount: {
      type: Number,
      default: null,
    },
    final_amount: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      default: "active",
      enum: ["active", "expired", "redeemed", "under-dispute", "upgraded"],
    },
    vendor_bill_status: {
      type: Boolean,
      default: false,
    },
    // This key is used for storing the time when the offer is approved by the vendor
    used_time: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
    },
    bill: {
      type: String,
      default: null,
    },
    offer_paid_amount: {
      type: Number,
      default: 0,
    },
    upgraded_from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OfferBuy",
      default: null,
    },
    upgrade_chain_root: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OfferBuy",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("OfferBuy", OfferBuySchema);