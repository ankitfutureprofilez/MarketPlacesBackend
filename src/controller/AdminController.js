const Offer = require("../model/Offer");
const Payment = require("../model/Payment");
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
        const record = await User.find({ role: "customer" });
        if (!record || record.length === 0) {
            return validationErrorResponse(res, "No Users found", 404);
        }
        return successResponse(res, "Customers fetched successfully", 200, record);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.PaymentGet = catchAsync(async (req, res) => {
    try {
        const record = await Payment.find({});
        if (!record || record.length === 0) {
            return validationErrorResponse(res, "No Users found", 404);
        }
        return successResponse(res, "payment fetched successfully", 200, record);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.AdminVendorGet = catchAsync(async (req, res) => {
    try {
        const { search = "", status = "", category = "" } = req.query;

        let query = {};

        if (search && search.trim() !== "") {
            const regex = { $regex: search.trim(), $options: "i" };

            const matchedUsers = await User.find({
                $or: [{ name: regex }, { email: regex }],
            }).select("_id");

            const userIds = matchedUsers.map((u) => u._id);
            query.$or = [{ business_name: regex }, { user: { $in: userIds } }];
        }

        if (category && category.trim() !== "") {
            query.category = category;
        }

        if (status === "verify") {
            query.Verify_status = "verify";
        } else if (status === "unverify") {
            query.Verify_status = "unverify";
        }


        const vendor = await Vendor.find(query)
            .populate("user")
            .populate("category")
            .populate("subcategory")
            .populate("assign_staff");

        return res.json({
            message: "Vendor Get!!",
            vendor,
            status: 200,
        });
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
        const adminid = req.user.id;

        // ✅ Correct spelling for fields
        const {
            business_name,
            city,
            categroy, // 🧠 matches request key spelling
            subcategory,
            state,
            pincode,
            area,
            name,
            phone,
            lat,
            long,
            address,
            aadhaar_front,
            aadhaar_back,
            pan_card_image,
            gst_certificate,
            GST_no,
            business_logo,
            opening_hours,
            weekly_off_day,
            business_register,
            business_image,
            email,
            landmark,
        } = req.body;

        // ✅ Step 1: Basic required field validation
        if (!name || !phone)
            return errorResponse(res, "Name and phone are required", 400);

        if (
            !business_name ||
            !city ||
            !categroy || // corrected field
            !subcategory ||
            !state ||
            !pincode ||
            !area
        ) {
            return errorResponse(res, "All vendor details are required", 400);
        }

        // ✅ Step 2: Phone uniqueness check
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return errorResponse(res, "Phone number already exists", 400);
        }

        // ✅ Step 3: Create User
        const userdata = new User({ name, phone, role: "vendor" });
        const savedUser = await userdata.save();

        if (!savedUser)
            return errorResponse(res, "Failed to create user", 500);

        // ✅ Step 4: Validate Opening Hours object (optional strict check)
        if (
            opening_hours &&
            typeof opening_hours !== "object"
        ) {
            return errorResponse(res, "Opening hours must be a valid object", 400);
        }

        // ✅ Step 5: Create Vendor record
        const vendor = new Vendor({
            user: savedUser._id,
            business_name,
            city,
            subcategory,
            state,
            pincode,
            area,
            name,
            phone,
            lat,
            long,
            address,
            aadhaar_front,
            aadhaar_back,
            pan_card_image,
            gst_certificate,
            gst_number: GST_no, // renamed correctly
            business_logo,
            opening_hours,
            weekly_off_day,
            business_register,
            business_image,
            email,
            landmark,
            added_by: adminid,
            category: categroy, // 🧠 Correct category field now saved properly
        });

        const savedVendor = await vendor.save();

        if (!savedVendor)
            return errorResponse(res, "Failed to create vendor", 500);

        return successResponse(
            res,
            "Vendor created successfully",
            201,
            savedVendor
        );
    } catch (error) {
        console.error(error);
        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});

exports.vendorUpdate = catchAsync(async (req, res) => {
    try {
        const adminid = req.user.id;
        const {
            _id,
            business_name,
            city,
            state,
            category,
            subcategory,
            pincode,
            area,
            name,
            phone,
            lat,
            long,
            address,
            aadhaar_front,
            aadhaar_back,
            pan_card_image,
            gst_certificate,
            gst_number,
            business_logo,
            opening_hours,
            weekly_off_day,
            business_register,
            business_image,
            email, avatar
        } = req.body;
        const userData = await User.findByIdAndUpdate({ _id: _id }, { email, name, avatar })
        const vendordata = await Vendor.findOneAndUpdate(
            { user: _id },
            {
                business_name,
                city,
                state,
                category,
                subcategory,
                pincode,
                area,
                name,
                phone,
                lat,
                long,
                address,
                aadhaar_front,
                aadhaar_back,
                pan_card_image,
                gst_certificate,
                gst_number,
                business_logo,
                opening_hours,
                weekly_off_day,
                business_register,
                business_image,
                email,
                added_by: adminid,
            },
            { new: true, runValidators: true }
        ).populate("user");

        if (!vendordata) {
            return validationErrorResponse(res, "Vendor not found", 404);
        }

        return successResponse(res, "Admin Vendor updated successfully", 200, vendordata);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.adminGet = catchAsync(async (req, res) => {
    try {
        const adminId = req.user?.id || null;
        const admins = await User.findOne({ role: "admin" }).select("-password");

        if (!admins || admins.length === 0) {
            return validationErrorResponse(res, "No admin users found", 404);
        }

        return successResponse(res, "Admin users fetched successfully", 200, admins);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.VendorGetId = catchAsync(async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            return errorResponse(res, "Vendor ID is required", 400);
        }
        const record = await Vendor.findById(
            {
                _id: id
            }
        )
            .populate("user")
            .populate("category")
            .populate("subcategory");
        if (!record) {
            return validationErrorResponse(res, "Vendor not found", 404);
        }
        const vendorid = record.user._id;
        const offer = await Offer.find({ vendor: vendorid }).populate("flat").populate("percentage");
        return successResponse(res, "Vendor details fetched successfully", 200, { record, offer, coupon: 25, redeem: 23, purchased: 25, pending: 55 });
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.AdminDashboard = catchAsync(async (req, res) => {
    try {
        const vendors = await Vendor.find({}).limit(5).sort({ "createdAt": -1 }).populate("user")
        return successResponse(res, "Admin users fetched successfully", 200, {
            vendors,
            stats: {
                total_vendors: await Vendor.countDocuments(),
                redeemed_offeres: 10,
                coupons: 5,
                total_sales: await User.countDocuments(
                    {
                        "role": "sales"
                    }
                ),
            },
        });
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.AssignStaff = catchAsync(async (req, res) => {
    try {
        const { vendor_id, assign_staff } = req.body;

        // Validate input
        if (!vendor_id || !assign_staff) {
            return validationErrorResponse(res, "vendor_id and assign_staff are required", 400);
        }

        const vendordata = await Vendor.findByIdAndUpdate(
            vendor_id,
            { assign_staff: assign_staff },
            { new: true }
        );

        if (!vendordata) {
            return validationErrorResponse(res, "Vendor not found", 404);
        }
        return successResponse(res, "Assign Staff Successfully", 200, vendordata);
    } catch (error) {
        console.error("Error assigning staff:", error);
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});
