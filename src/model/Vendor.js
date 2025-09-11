const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
    {
        uuid: {
            type: String,
            unique: true,
            required: true,
        },
        business_name: {
            type: String,
            required: true,
            trim: true,
        },
        city: {
            type: String,
            required: true,
        },
        area: {
            type: String,
            required: true,
        },
        pincode: {
            type: Number,
            required: true,
        },
        category: {
            type: String,
            default: null,
        },
        subcategory: {
            type: String,
            default: null,
        },
        business_register: {
            type: String,
            required: true,
        },
        pan_card: {
            type: Boolean,
            default: false,
        },
        GST_no: {
            type: String,
            default: null,
        },
        address: {
            type: String,
            required: true,
        },
        lat: {
            type: Number,
            default: null,
        },
        long: {
            type: Number,
            default: null,
        },
        landmark: {
            type: String,
            default: null,
        },
        adhar_front: {
            type: String,
            default: null,
        },
        adhar_back: {
            type: String,
            default: null,
        },
        pan_card_image: {
            type: String,
            default: null,
        },
        gst_certificate: {
            type: String,
            default: null,
        },
        shop_license: {
            type: String,
            default: null,
        },
        business_logo: {
            type: String,
            default: null,
        },
        opening_hours: {
            type: String,
            default: null,
        },
        weekly_off_day: {
            type: String,
            default: null,
        },
        users:   {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Vendor", vendorSchema);
