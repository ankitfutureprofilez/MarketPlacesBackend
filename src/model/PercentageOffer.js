const mongoose = require("mongoose");

const percentageOfferSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Offer title is required"],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: null,
        },
        discountPercentage: {
            type: Number,
            required: [true, "Discount percentage is required"],
            min: [0, "Discount cannot be less than 0%"],
            max: [100, "Discount cannot be more than 100%"],
        },
        maxDiscountCap: {
            type: Number,
            default: 0,
        },
        minBillAmount: {
            type: Number,
            default: 0,
        },
        amount: {
            type: Number,
            default: 0,
        },
        expiryDate: {
            type: Date,
            required: [true, "Expiry date is required"],
        },
        offer_image: {
            type: String,
            default: null,
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },
        isExpired: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("PercentageOffer", percentageOfferSchema);
