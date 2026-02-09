const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        minlength: [2, "Name must be at least 2 characters long"],
        maxlength: [50, "Name must be less than 50 characters"],
        trim: true,
    },
    phone: {
        type: Number,
        required: [true, "Phone number is required"],
        unique: true,
        validate: {
            validator: function (v) {
                return /^[0-9]{10}$/.test(v);
            },
            message: "Phone number must be exactly 10 digits"
        }
    },
    email: {
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
        sparse: true,
        validate: {
            validator: function (v) {
                if (!v) return true;
                return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/.test(v);
            },
            message: "Invalid email format"
        }
    },
    avatar: {
        type: String,
        default: null,
    },
    password: {
        type: String,
        minlength: [8, "Password must be at least 8 characters long"],
    },
    role: {
        type: String,
        enum: {
            values: ["admin", "customer", "sales", "vendor", "sub-admin"],
            enums: ["admin", "customer", "sales", "vendor", "sub-admin"],
            message: "Role must be admin, sub-admin, customer, sales, or vendor"
        },
        default: "customer",
    },
    permissions: {
        type: [String],
        default: [],
    },
    deleted_at: {
        type: Date,
        default: null
    }
}, { timestamps: true });

UserSchema.index({ name: 1, email: 1 }, { unique: true });

module.exports = mongoose.model("User", UserSchema);