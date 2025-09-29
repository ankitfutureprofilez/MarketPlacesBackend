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
            max: 100, 
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
        status :{
            type: String,
            default  : "active",
            enum :["active" ,  "inactive"]
        },
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        amount :{
            type: Number, 
            default :0 
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Offer", addOfferSchema);
