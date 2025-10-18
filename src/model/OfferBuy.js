const mongoose = require("mongoose");

const OfferBuySchema = new mongoose.Schema(
    {
        user:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        offer:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Offer",
        },
        vendor:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        payment_id: {
           type: mongoose.Schema.Types.ObjectId,
           ref: "Payment",
        },
        discount: {
            type: Number,
            default: 0
        },
        total_amount: {
            type: Number,
            default: 0
        },
        final_amount: {
            type: Number,
            default: 0
        },
        status:{
            type: String,
            default: "active",
            enum:["active", "expired", "redeemed", "under-dispute"]
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("OfferBuy", OfferBuySchema);
