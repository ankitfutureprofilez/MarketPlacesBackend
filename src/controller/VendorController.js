const categories = require("../model/categories");
const SubCategory = require("../model/SubCategory");
const User = require("../model/User");
const Vendor = require("../model/Vendor");
const catchAsync = require("../utils/catchAsync");
const { validationErrorResponse, successResponse, errorResponse } = require("../utils/ErrorHandling");

exports.VendorRegister = catchAsync(async (req, res) => {
    try {
        const userid = req.user._id;
        const {
            business_name,
            city,
            category,
            subcategory,
            state, pincode,
            area,
            name
        } = req.body;

        const userdata = await User.findByIdAndUpdate(
            userid,
            { name: name },
            { new: true }
        );

        const vendor = new Vendor({
            business_name, city,
            category,
            subcategory,
            state, pincode, area,
            users: userid
        });
        const record = await vendor.save();
        return successResponse(res, "Vendor created successfully", record);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

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
        const category_id =  req.params.id
        const record = await SubCategory.find({category_id});
        if (record) {
            return validationErrorResponse(res, "SubCategory not found", 404);
        }
        return successResponse(res, "SubCategory fetched successfully", record);
    } catch (error) {
        console.log("error", error)
        return errorResponse(res, error.message || "Internal Server Error", 500);

    }
});


exports.VendorGetId = catchAsync(async (req, res) => {
    try {
        const userId = req.user?._id || req.params.id;
        const record = await Vendor.findById({ users: userId }).populate("users");
        if (!record) {
            return validationErrorResponse(res, "Vendor not found", 404);
        }
        return successResponse(res, "Vendor details fetched successfully", record);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.VendorGet = catchAsync(async (req, res) => {
    try {
        const vendors = await Vendor.find({}).populate("users");
        if (!vendors || vendors.length === 0) {
            return validationErrorResponse(res, "No vendors found", 404);
        }
        return successResponse(res, "Vendors fetched successfully", vendors);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.vendorUpdate = catchAsync(async (req, res) => {
    try {
        const vendorId = req.user?._id || req.params.id;

        const {
            business_name,
            city,
            area,
            pincode,
            category,
            subcategory,
            business_register,
            pan_card,
            GST_no,
            address,
            lat,
            long,
            landmark,
            adhar_front,
            adhar_back,
            pan_card_image,
            gst_certificate,
            shop_license,
            business_logo,
            opening_hours,
            weekly_off_day,
        } = req.body;

        const vendordata = await Vendor.findByIdAndUpdate(
            vendorId,
            {
                business_name,
                city,
                area,
                pincode,
                category,
                subcategory,
                business_register,
                pan_card,
                GST_no,
                address,
                lat,
                long,
                landmark,
                adhar_front,
                adhar_back,
                pan_card_image,
                gst_certificate,
                shop_license,
                business_logo,
                opening_hours,
                weekly_off_day,
            },
            { new: true } 
        );

        if (!vendordata) {
            return validationErrorResponse(res, "Vendor not found", 404);
        }

        return successResponse(res, "Vendor updated successfully", vendordata);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.vendorDelete = catchAsync(async (req, res) => {
    try {
        const vendorId = req.user?._id || req.params.id;

        const vendordata = await Vendor.findByIdAndDelete(vendorId);

        if (!vendordata) {
            return validationErrorResponse(res, "Vendor not found", 404);
        }

        return successResponse(res, "Vendor deleted successfully", vendordata);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.VendorStatus = catchAsync(async (req, res) => {
    try {
        const sales = req.user._id;
        const { Verify_status } = req.body;
        const vendorId = req.params.id;
        const record = await Vendor.findByIdAndUpdate(
            vendorId,
            { Verify_status, sales },
            { new: true }
        );
        if (!record) {
            return validationErrorResponse(res, "Vendor not found", 404);
        }
        return successResponse(res, "Vendor status updated successfully", record);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});
