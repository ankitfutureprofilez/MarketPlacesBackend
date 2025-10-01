const User = require("../model/User");
const Vendor = require("../model/Vendor");
const catchAsync = require("../utils/catchAsync");
const { errorResponse, successResponse, validationErrorResponse } = require("../utils/ErrorHandling");
const jwt = require("jsonwebtoken");

exports.Login = catchAsync(async (req, res) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password || !role) {
            return validationErrorResponse(
                res,
                "email , password and role all are required",
                401
            );
        }
        const user = await User.findOne({ email: email });
        const token = jwt.sign(
            { id: user._id, role: user.role, email: user.email },
            process.env.JWT_SECRET_KEY,
            { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
        );
        console.log("token", token)
        return successResponse(res, "Admin Login successfully", 200, {
            user: user,
            token: token,
            role: user?.role,
        });

        // Verify OTP with Twilio
        // const verificationCheck = await client.verify.v2
        //   .services(process.env.TWILIO_VERIFY_SID)
        //   .verificationChecks.create({ to: phone, code: otp });
        // if (verificationCheck.status === "approved") {
        //   return successResponse(res, "OTP verified successfully", 200);
        // } else {
        //   return validationErrorResponse(res, "Invalid or expired OTP", 400);
        // }
    } catch (error) {
        console.error("VerifyOtp error:", error);
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.UserGet = catchAsync(async (req, res) => {
    try {
        const record = await User.find({ role: "user" });
        if (!record || record.length === 0) {
            return validationErrorResponse(res, "No Users found", 404);
        }
        return successResponse(res, "Users fetched successfully", record);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.VendorGet = catchAsync(async (req, res) => {
    try {
        const vendor = await Vendor.find().populate("vendor").populate("category").populate("subcategory");
        if (!vendor || vendor.length === 0) {
            return validationErrorResponse(res, "No Vendors found", 404);
        }
        return res.json({
            message: "Vendor Get!!",
            vendor: vendor,
            status: 200
        })

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});


exports.SalesGet = catchAsync(async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const search = req.query.search || "";
        let userData, totalPages, totaluser;

        // Fetch users based on the filter
        const filter = { role: "sales" };
        const skip = (page - 1) * limit;

        const users = await User.find(filter)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);


        if (search === "") {
            const skip = (page - 1) * limit;
            totaluser = await User.countDocuments();
            userData = await User.find(filter)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit)
            totalPages = Math.ceil(totaluser / limit);
        }
        else {
            userData = await filterUsers(search);
            totalPages = 1;
            totaluser = userData;
        }
        res.status(200).json({
            data: {
                userData: userData,
                totaluser: totaluser,
                totalPages: totalPages,
                currentPage: page,
                perPage: limit,
                nextPage: page < totalPages ? page + 1 : null,
                previousPage: page > 1 ? page - 1 : null,
            },
            msg: "User Get",
        });
    } catch (error) {
        res.status(500).json({
            msg: "Failed to fetch User get",
            error: error.message,
        });
    }
});

exports.VendorRegister = catchAsync(async (req, res) => {
    try {
        const adminid = req.User.id
        console.log("req.", req.body)
        const {
            business_name,
            city,
            category,
            subcategory,
            state,
            pincode,
            area,
            name,
            phone,
            lat, long,
            address,
            adhar_front,
            adhar_back,
            pan_card_image,
            gst_certificate,
            gst_number,
            business_logo,
            opening_hours,
            weekly_off_day,
            business_register,
            business_image,
            email

        } = req.body;

        if (!name || !phone) {
            return errorResponse(res, "Name and phone are required", 400);
        }

        // if (!business_name || !city || !category || !subcategory || !state || !pincode || !area) {
        //     return errorResponse(res, "All vendor details are required", 400);
        // }

        const Users = await User.findOne({ phone: phone });

        if (Users) {
            return errorResponse(res, "Phone number already exists", 400,);
        }


        const userdata = new User({ name, phone, role: "vendor" });
        const savedUser = await userdata.save();
        if (!savedUser) {
            return errorResponse(res, "Failed to create user", 500);
        }

        const vendor = new Vendor({
            vendor: savedUser._id,
            business_name,
            city,
            category,
            subcategory,
            state,
            pincode,
            area,
            name,
            phone,
            lat, long,
            address,
            adhar_front,
            adhar_back,
            pan_card_image,
            gst_certificate,
            gst_number,
            business_logo,
            opening_hours,
            weekly_off_day,
            business_register,
            business_image,
            email,
            admin: adminid
        });

        const savedVendor = await vendor.save();

        if (!savedVendor) {
            return errorResponse(res, "Failed to create vendor", 500,);
        }

        return successResponse(res, "Vendor created successfully", 201, savedVendor); // 201 = Created
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});



exports.adminGet = catchAsync(async (req, res) => {
    try {
        const adminId = req.User?.id || null;
        console.log("adminId", adminId)
        const admins = await User.findOne({ role: "admin" }).select("-password");

        if (!admins || admins.length === 0) {
            return validationErrorResponse(res, "No admin users found", 404);
        }

        return successResponse(res, "Admin users fetched successfully", 200, admins);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});
