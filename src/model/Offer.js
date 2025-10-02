const mongoose = require("mongoose");

const OfferSchema = new mongoose.Schema(
    {

        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        flat: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "flat",
        },
        percentage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PercentageOffer",
        },
        type: {
            type: String,
            enum: ["percentage", "flat"]
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },

    },
    { timestamps: true }
);

module.exports = mongoose.model("Offer", OfferSchema);
