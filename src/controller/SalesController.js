const User = require("../model/User");
const Vendor = require("../model/Vendor");
const catchAsync = require("../utils/catchAsync");
const { errorResponse, successResponse, validationErrorResponse } = require("../utils/ErrorHandling");

exports.SalesGetId = catchAsync(async (req, res) => {
    try {
        const salesId = req.params.id
        const sales = User.find({ role: "sales", _id: salesId })
        return successResponse(res, "Sales Get successfully", 201, sales);
    } catch (error) {
        console.log("error", error)
        return errorResponse(res, "Failed to create Sales", 500);
    }
})

exports.VendorRegister = catchAsync(async (req, res) => {
    try {
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
            sales
        } = req.body;

        if (!name || !phone) {
            return errorResponse(res, "Name and phone are required", 400);
        }

        if (!business_name || !city || !category || !subcategory || !state || !pincode || !area) {
            return errorResponse(res, "All vendor details are required", 400);
        }

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
            business_name,
            city,
            category,
            subcategory,
            state,
            pincode,
            area,
            vendor: savedUser._id,
            sales: sales
        });

        const savedVendor = await vendor.save();

        if (!savedVendor) {
            return errorResponse(res, "Failed to create vendor", 500,);
        }
        return successResponse(res, "Vendor created successfully", 201, vendor);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.VendorStatus = catchAsync(async (req, res) => {
    try {
        const { Verify_status, vendorId } = req.body;
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

exports.VendorGetAll = catchAsync(async (req, res) => {
    try {
        const sales = req.params.id;
        const vendorget = await Vendor.find({ sales: sales });
        if (!vendorget) {
            return validationErrorResponse(res, "Vendor not found", 404);
        }
        return successResponse(res, "Vendor status updated successfully", vendorget);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
})


