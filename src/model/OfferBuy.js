const mongoose = require("mongoose");

const OfferBuySchema = new mongoose.Schema(
    {

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        offer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "offer",
        },
        payment_id: {
            type: String,
            default: null
        },
        offer_amount: {
            type: number,
            default: 0
        },
        total_amount: {
            type: number,
            default: 0
        },
        payment_status: {
            type: Boolean,
            enum: ["success", 'failed'],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("OfferBuy", OfferBuySchema);
