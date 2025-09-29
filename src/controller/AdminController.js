const User = require("../model/User");
const Vendor = require("../model/Vendor");
const catchAsync = require("../utils/catchAsync");
const { errorResponse } = require("../utils/ErrorHandling");

exports.Adminlogin = catchAsync(async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return errorResponse(res, "All fields are required", 400);
        }
        const user = await User.find({
            email
        });
        if (!user) {
            return errorResponse(res, "User not found", 404);
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return errorResponse(res, "Invalid credentials", 401);
        }
        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email },
            process.env.JWT_SECRET_KEY,
            { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
        );
        return successResponse(res, "Login successful", 200, {
            email: user.email,
            token: token,
        });
    } catch (error) {
        console.log("Login error:", error);
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


