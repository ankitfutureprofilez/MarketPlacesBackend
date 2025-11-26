const mongoose = require("mongoose");

const flatoffer = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: null,
            trim: true,
        },
        // Ye percentage nhi fix amount hai flat table ke liye and maxDiscountCap useless hai iss mein
        discountPercentage: {
            type: Number,
            required: [true, "Discount percentage is required"],
        },
        maxDiscountCap: {
            type: Number,
            default: 0,
        },
        minBillAmount: {
            type: Number,
            default: 0,
        },
        expiryDate: {
            type: Date,
            required: true,
        },
        offer_image: {
            type: String,
        },
        amount: {
            type: Number,
            default: 0
        },
        isExpired: {
            type: Boolean,
            default: false,
            enum: [true, false]
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("flat", flatoffer);
