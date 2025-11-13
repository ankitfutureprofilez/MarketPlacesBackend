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
            default: null
        },
        total_amount: {
            type: Number,
            default: null
        },
        final_amount: {
            type: Number,
            default: null
        },
        status:{
            type: String,
            default: "active",
            enum:["active", "expired", "redeemed", "under-dispute"]
        },
         vendor_bill_status:{
            type: Boolean,
            default: false,
        },
        description :{
            type: String
        },
        bill:{
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("OfferBuy", OfferBuySchema);
