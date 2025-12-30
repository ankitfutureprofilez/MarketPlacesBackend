const mongoose = require("mongoose");

const paymentSchema = mongoose.Schema({
  payment_id: {
    type: String,
  },
  amount: {
    type: Number,
  },
  currency: {
    type: String,
    default: "INR",
  },
  payment_status: {
    type: String,
    default: "pending",
  },
  payment_method: {
    type: String,
  },
  offer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Offer",
  },
  event: String,
  payment_date: {
    type: Date,
    default: Date.now,
  },
  payment_type: {
    type: String,
    enum: ["buy", "upgrade"],
    default: "buy",
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  vendor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
