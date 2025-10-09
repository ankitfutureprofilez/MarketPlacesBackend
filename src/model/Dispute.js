const mongoose = require("mongoose");

const disputeSchema = new mongoose.Schema(
    {
        offer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Offer",
            required: true,
        },
        offerBuy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OfferBuy",
            required: true,
        },
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        reason: {
            type: String,
            required: true,
        },
        reasonCode: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            default: "new",
            enum: ["new", "in-review", "awaiting-evidence", "resolved", "closed"]
        },
        raisedBy: {
            type: String,
            required: true,
            enum: ["customer", "vendor"]
        },
        customerEvidence: {
            type: String,
            default: null,
        },
        vendorEvidence: {
            type: String,
            default: null,
        },
        decision: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Dispute", disputeSchema);