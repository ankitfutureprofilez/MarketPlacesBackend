const User = require("../model/User");
const catchAsync = require("../utils/catchAsync");

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
        const record = await User.find({role :"user"});
        if (!record || record.length === 0) {
            return validationErrorResponse(res, "No Users found", 404);
        }
        return successResponse(res, "Users fetched successfully", record);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.SalesGet = catchAsync(async (req, res) => {
    try {
        const sales = await User.find({role :"sales"});
        if (!sales || sales.length === 0) {
            return validationErrorResponse(res, "No Sales found", 404);
        }
        return successResponse(res, "Sales fetched successfully", sales);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.VendorGet = catchAsync(async (req, res) => {
    try {
        const vendor = await User.find({role :"vendor"});
        if (!vendor || vendor.length === 0) {
            return validationErrorResponse(res, "No Vendors found", 404);
        }
        return successResponse(res, "Vendors fetched successfully", vendor);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});