const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
    },
    avatar: {
        type: String,
        default: null,
    },
    password: {
        type: String,
        required: true,
    },
    OTP: {
        type: String,
    },
    role: {
        type: String,
        enum: ["admin", "user", "staff"],
        default: "user",
    },
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
