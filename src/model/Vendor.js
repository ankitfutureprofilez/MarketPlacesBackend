const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
    {
        state: {
            type: String,
            default: "rajasthan"
        },
        uuid: {
            type: String,
            unique: true,
        },
        business_name: {
            type: String,
            trim: true,
        },
        city: {
            type: String,
        },
        area: {
            type: String,
        },
        pincode: {
            type: Number,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
        },
        subcategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SubCategory",
        },
        business_register: {
            type: String,
        },
        address: {
            type: String,
        },
        lat: {
            type: Number,
            default: null,
        },
        long: {
            type: Number,
            default: null,
        },
        // Address Proofs
        aadhaar_front: {
            type: String,
            default: null,
        },
        aadhaar_back: {
            type: String,
            default: null,
        },
        aadhaar_verify: {
            type: String,
            default: "pending"
        },
        aadhaar_reason: {
            type: String,
            default: null
        },
        pan_card_image: {
            type: String,
            default: null,
        },
        pan_card_verify: {
            type: String,
            default: "pending"
        },
        pan_card_reason: {
            type: String,
            default: null
        },
        driving_license: {
            type: String,
            default: null,
        },
        driving_license_verify: {
            type: String,
            default: "pending"
        },
        driving_license_reason: {
            type: String,
            default: null
        },
        passport: {
            type: String,
            default: null,
        },
        passport_verify: {
            type: String,
            default: "pending"
        },
        passport_reason: {
            type: String,
            default: null
        },
        // Business Proofs
        gst_certificate: {
            type: String,
            default: null,
        },
        gst_certificate_verify: {
            type: String,
            default: "pending"
        },
        gst_certificate_reason: {
            type: String,
            default: null
        },
        // Udhyam is a govrment registration for small business in India
        udhyam: {
            type: String,
            default: null,
        },
        udhyam_verify: {
            type: String,
            default: "pending"
        },
        udhyam_reason: {
            type: String,
            default: null
        },
        trade_license: {
            type: String,
            default: null,
        },
        trade_license_verify: {
            type: String,
            default: "pending"
        },
        trade_license_reason: {
            type: String,
            default: null
        },
        shop_license: {
            type: String,
            default: null,
        },
        shop_license_verify: {
            type: String,
            default: "pending"
        },
        shop_license_reason: {
            type: String,
            default: null
        },
        gst_number: {
            type: String,
            default: null,
        },
        business_image: {
            type: [Object], // array of objects
            default: [],
        },
        business_logo: {
            type: String,
            default: null,
        },
        opening_hours: {
            Mon: {
                open: { type: String, },
                close: { type: String, },
                active: { type: Boolean, default: true },
            },
            Tue: {
                open: { type: String, },
                close: { type: String, },
                active: { type: Boolean, default: true },
            },
            Wed: {
                open: { type: String, },
                close: { type: String, },
                active: { type: Boolean, default: true },
            },
            Thu: {
                open: { type: String, },
                close: { type: String, },
                active: { type: Boolean, default: true },
            },
            Fri: {
                open: { type: String, },
                close: { type: String, },
                active: { type: Boolean, default: true },
            },
            Sat: {
                open: { type: String, },
                close: { type: String, },
                active: { type: Boolean, default: true },
            },
            Sun: {
                open: { type: String, },
                close: { type: String, },
                active: { type: Boolean, default: false },
            },
        },
        // It is actually holidays array but named wrongly
        weekly_off_day: {
            type: [Date],
            default: [],
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        added_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        assign_staff: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        status: {
            type: String,
            default: "active",
            enum: ["active", "inactive"]
        },
        Verify_status: {
            type: String,
            default: "pending",
            enum: ["pending", "verify", "unverify"]
        },
        country: {
            type: String,
            default: "India"
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("vendor", vendorSchema);
