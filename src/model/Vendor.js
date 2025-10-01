const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
    {
        state :{
            type: String ,
            default :"rajasthan"
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

      weekly_off_day: {
    type: Date,
    default: () => new Date(), // stores current date in UTC
  },
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        sales: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        status: {
            type: String,
            default: "active",
            enum: ["active", "inactive"]
        },
        Verify_status: {
            type: String,
            default: "unverify",
            enum: ["verify", "unverify"]
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("vendor", vendorSchema);
