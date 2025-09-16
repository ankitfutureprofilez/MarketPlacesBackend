const categories = require("../model/categories");
const SubCategory = require("../model/SubCategory");
const catchAsync = require("../utils/catchAsync");
const { validationErrorResponse, successResponse, errorResponse } = require("../utils/ErrorHandling");

exports.category = catchAsync(async (req, res) => {
    try {
        const record = await categories.find({});
        if (record) {
            return validationErrorResponse(res, "category not found", 404);
        }
        return successResponse(res, "category fetched successfully", record);
    } catch (error) {
        console.log("error", error)
        return errorResponse(res, error.message || "Internal Server Error", 500);

    }
});

exports.subcategory = catchAsync(async (req, res) => {
    try {
        const category_id = req.params.id
        const record = await SubCategory.find({ category_id });
        if (record) {
            return validationErrorResponse(res, "SubCategory not found", 404);
        }
        return successResponse(res, "SubCategory fetched successfully", record);
    } catch (error) {
        console.log("error", error)
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

