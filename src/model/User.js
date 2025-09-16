const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    phone: {
        type: Number,
        required: true,
        unique: true
    },
    email: {
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
    },
    avatar: {
        type: String,
        default: null,
    },
    password: {
        type: String,
    },
    OTP: {
        type: String,
    },
    role: {
        type: String,
        enum: ["admin", "customer", "staff" ,"vendor"],
        default: "customer",
    },
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
