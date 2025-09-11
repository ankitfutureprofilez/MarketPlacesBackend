const mongoose = require("mongoose");

const addOfferSchema = new mongoose.Schema(
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
        discountPercentage: {
            type: Number,
            required: true,
            min: 0,
            max: 100, // 0–100%
        },
        maxDiscountCap: {
            type: Number,
            required: true,
            default: 0,
        },
        minBillAmount: {
            type: Number,
            required: true,
            default: 0,
        },
        expiryDate: {
            type: Date,
            required: true,
        },
        Image: {
            type: String,
        },
        status :{
            type: String,
            default  : "active",
            enum :["active" ,  "inactive"]
        },
        users: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Offer", addOfferSchema);
