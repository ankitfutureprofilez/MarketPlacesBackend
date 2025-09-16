const User = require("../model/User");
const catchAsync = require("../utils/catchAsync");


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
