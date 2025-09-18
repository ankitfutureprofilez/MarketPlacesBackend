const User = require("../model/User");
const Vendor = require("../model/Vendor");
const catchAsync = require("../utils/catchAsync");
const categories = require("../model/categories");
const SubCategory = require("../model/SubCategory");
const Offer = require("../model/AddOffer.js");
const { validationErrorResponse, successResponse, errorResponse } = require("../utils/ErrorHandling");
// Vendor Register
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
            phone
        } = req.body;

        if (!name || !phone) {
            return errorResponse(res, "Name and phone are required", 400);
        }

        if (!business_name || !city || !category || !subcategory || !state || !pincode || !area) {
            return errorResponse(res, "All vendor details are required", 400);
        }

        const Users = await User.findOne({ phone: phone });

        if (Users) {
            return errorResponse(res, "Phone number already exists", 400 , );
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
        });

        const savedVendor = await vendor.save();

        if (!savedVendor) {
            return errorResponse(res, "Failed to create vendor", 500,);
        }

        return successResponse(res, "Vendor created successfully", 201, vendor); // 201 = Created
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.VendorGetId = catchAsync(async (req, res) => {
    try {
        const _id = req.params.id;
        console.log("vendorId:", _id);
        const record = await Vendor.findById(_id).populate("vendor");
        if (!record) {
            return validationErrorResponse(res, "Vendor not found", 404);
        }

        return successResponse(res, "Vendor details fetched successfully", 200, record);
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



// Offer Management 
// Add Offer 
exports.AddOffer = catchAsync(async (req, res) => {
    try {
        const userId = req.params?.id;
        console.log("vendor" ,userId)
        const { title, description, expiryDate, image, discountPercentage, maxDiscountCap, minBillAmount, amount } = req.body;
        const newOffer = new Offer({
            title,
            description,
            expiryDate,
            discountPercentage,
            maxDiscountCap,
            minBillAmount,
            amount,
            offer_image: image,
            vendor: userId
        });
        const record = await newOffer.save();
        return successResponse(res, "Offer created successfully", 200, record);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

// Get Offer Id 
exports.GetOfferId = catchAsync(async (req, res) => {
    try {
        const offerId = req.params.id;
        const record = await Offer.findById({ _id: offerId }).populate("vendor");
        if (!record) {
            return validationErrorResponse(res, "Vendor not found", 404);
        }
        return successResponse(res, "Vendor details fetched successfully", 200, record);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

// Offer Get 
exports.GetOffer = catchAsync(async (req, res) => {
    try {
        const offerId = req.params.id;
        const record = await Offer.find({ vendor: offerId });
        if (!record) {
            return validationErrorResponse(res, "Vendor not found", 404);
        }
        return successResponse(res, "Vendor details fetched successfully", 200, record);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

// Offer Status 
exports.OfferStatus = catchAsync(async (req, res) => {
    try {
        const offerId = req.params.id;
        const { status   } = req.body;
        const record = await Offer.findByIdAndUpdate(
            offerId,
            { status },
            { new: true }
        );
        if (!record) {
            return validationErrorResponse(res, "Offer not found", 404);
        }
        return successResponse(res, "Offer status updated successfully",201,  record);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

// Edit Offer 
exports.EditOffer = catchAsync(async (req, res) => {
    try {
        const { title, description, expiryDate, image, discountPercentage, maxDiscountCap, minBillAmount, Id, amount } = req.body;
        const record = await Offer.findByIdAndUpdate(Id, {
            title, description, expiryDate, image,
            discountPercentage,
            maxDiscountCap, minBillAmount, amount
        }, { new: true });
        return successResponse(res, "Offer created successfully", record);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
})



// Category Management
//  Category 
exports.category = catchAsync(async (req, res) => {
    try {
        const record = await categories.find({});
        if (!record) {
            return validationErrorResponse(res, "category not found", 404);
        }
        return successResponse(res, "category fetched successfully", 200, record);
    } catch (error) {
        console.log("error", error)
        return errorResponse(res, error.message || "Internal Server Error", 500);

    }
});

// Sub Category 
exports.subcategory = catchAsync(async (req, res) => {
    try {
        const category_id = req.params.id
        const record = await SubCategory.find({ category_id });
        if (!record) {
            return validationErrorResponse(res, "SubCategory not found", 404);
        }
        return successResponse(res, "SubCategory fetched successfully", 200, record);
    } catch (error) {
        console.log("error", error)
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});
