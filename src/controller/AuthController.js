const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync");
const User = require("../model/User");
const { promisify } = require("util");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { validationErrorResponse, errorResponse, successResponse } = require("../utils/ErrorHandling");
const logger = require("../utils/Logger");

exports.verifyToken = async (req, res, next) => {
    try {
        let authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader || !authHeader.startsWith("Bearer")) {
            return res.status(400).json({
                status: false,
                message: "Token is missing or malformed",
            });
        }

        // Extract the token
        let token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(400).json({
                status: false,
                message: "Token is missing",
            });
        }

        // Verify the token
        const decode = await promisify(jwt.verify)(
            token,
            process.env.JWT_SECRET_KEY
        );

        if (!decode) {
            return res.status(401).json({
                status: false,
                message: "Unauthorized or invalid token",
            });
        }

        // Check the user in the database
        const user = await User.findById(decode.id);
        if (!user) {
            return res.status(404).json({
                status: false,
                message: "User not found",
            });
        }

        // Attach user to request object and proceed
        req.User = user;
        next();
    } catch (err) {
        return res.status(401).json({
            status: false,
            message: "Invalid or expired token",
            error: err.message,
        });
    }
};

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit OTP
}

exports.signup = catchAsync(async (req, res) => {
    try {
        const {
            email,
            password,
            name,
            avatar,
            OTP,
            role,
        } = req.body;

        // Check if required fields are provided
        if (!name || !role) {
            return res.status(401).json({
                status: false,
                message: 'All fields are required',
            });
        }

        // Check if user already exists
        const existingUser = await User.find({ $or: [{ email }, { phone_number }] });

        if (existingUser.length > 0) {
            const errors = {};
            existingUser.forEach(user => {
                if (user.email === email) {
                    errors.email = 'Email is already in use!';
                }
                if (user.phone_number === phone_number) {
                    errors.phone_number = 'Phone number is already in use!';
                }
            });

            return res.status(400).json({
                status: false,
                message: 'Email or phone number already exists',
                errors,
            });
        }

        const record = new User({
            name, email, phone_number, OTP, avatar, role
        });

        const result = await record.save();

        return successResponse(res, "You have been registered successfully !!", 201);

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});
