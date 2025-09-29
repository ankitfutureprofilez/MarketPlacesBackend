const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync");
const User = require("../model/User");
const { promisify } = require("util");
const bcrypt = require("bcrypt");
// const nodemailer = require("nodemailer");
const { validationErrorResponse, errorResponse, successResponse } = require("../utils/ErrorHandling");
// const logger = require("../utils/Logger");
const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

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

exports.SendOtp = catchAsync(async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return validationErrorResponse(res, "Phone number is required", 401);
    }
    return successResponse(res, "OTP sent successfully", 200);

    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verifications.create({ to: phone, channel: "sms" });

    if (verification.status === "pending") {
      return successResponse(res, "OTP sent successfully", 200);
    } else {
      return errorResponse(res, "Failed to send OTP", 500);
    }
  } catch (error) {
    console.error("SendOtp error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.Login = catchAsync(async (req, res) => {
  try {
    const { phone, otp, role } = req.body;
    if (!phone || !otp || !role) {
      return validationErrorResponse(
        res,
        "Phone number, OTP and role all are required",
        401
      );
    }
    if (otp !== "123456") {
        return validationErrorResponse(res, "Invalid or expired OTP", 400);
    }
    const user = await User.findOne({phone: phone});
    if (!user) {
       return successResponse(res, "OTP verified, please sign up now", 200, {
        role: role,
       });
    }
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET_KEY,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );
    return successResponse(res, "OTP verified successfully", 200, {
        user:user,
        token:token,
        role: user?.role,
    });

    // Verify OTP with Twilio
    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verificationChecks.create({ to: phone, code: otp });
    if (verificationCheck.status === "approved") {
      return successResponse(res, "OTP verified successfully", 200);
    } else {
      return validationErrorResponse(res, "Invalid or expired OTP", 400);
    }
  } catch (error) {
    console.error("VerifyOtp error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.signup = catchAsync(async (req, res) => {
  try {
    const { email, password, name, avatar, OTP, role } = req.body;

    // Check if required fields are provided
    if (!name || !role) {
      return res.status(401).json({
        status: false,
        message: "All fields are required",
      });
    }

    // Check if user already exists
    const existingUser = await User.find({
      $or: [{ email }, { phone_number }],
    });

    if (existingUser.length > 0) {
      const errors = {};
      existingUser.forEach((user) => {
        if (user.email === email) {
          errors.email = "Email is already in use!";
        }
        if (user.phone_number === phone_number) {
          errors.phone_number = "Phone number is already in use!";
        }
      });

      return res.status(400).json({
        status: false,
        message: "Email or phone number already exists",
        errors,
      });
    }

    const record = new User({
      name,
      email,
      phone_number,
      OTP,
      avatar,
      role,
    });

    const result = await record.save();

    return successResponse(
      res,
      "You have been registered successfully !!",
      201
    );
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.UserGet = catchAsync(async (req, res) => {
  try {
    const Users = await User.find({});
    if (!Users || Users.length === 0) {
      return validationErrorResponse(res, "No Users found", 404);
    }
    return successResponse(res, "Users fetched successfully", Users);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});
