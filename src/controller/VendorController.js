const User = require("../model/User");
const Vendor = require("../model/Vendor");
const catchAsync = require("../utils/catchAsync");
const categories = require("../model/categories");
const SubCategory = require("../model/SubCategory");
const Offer = require("../model/Offer.js");
const OfferBuy = require("../model/OfferBuy.js");
const { validationErrorResponse, successResponse, errorResponse } = require("../utils/ErrorHandling");
const jwt = require("jsonwebtoken");
const FlatOffer = require("../model/FlatOffer.js");
const PercentageOffer = require("../model/PercentageOffer.js");
const Payment = require("../model/Payment.js");

// Vendor Register
exports.VendorRegister = catchAsync(async (req, res) => {
    try {
        // console.log("req.", req.body)
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
            email
        } = req.body;
        // console.log("req.body", req.body)
        // if (!name || !phone) {
        //     return errorResponse(res, "Name and phone are required", 400);
        // }

        // if (!business_name || !city || !category || !subcategory || !state || !pincode || !area) {
        //     return errorResponse(res, "All vendor details are required", 400);
        // }


        const Users = await User.findOne({ phone: phone });

        if (Users) {
            return errorResponse(res, "Phone number already exists", 400,);
        }
        const userdata = new User({ name, phone, role: "vendor", email });
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
            email,
            area,
            user: savedUser._id,
            added_by: null,
            address,
            lat,
            long,
            aadhaar_front,
            aadhaar_back,
            pan_card_image,
            gst_certificate,
            business_logo,
            opening_hours,
            weekly_off_day,
            gst_number,
            business_register,
            business_image
        });

        const savedVendor = await vendor.save();

        if (!savedVendor) {
            return errorResponse(res, "Failed to create vendor", 500,);
        }
        const token = jwt.sign(
            { id: savedUser._id, role: savedUser.role, email: savedUser.email },
            process.env.JWT_SECRET_KEY,
            { expiresIn: process.env.JWT_EXPIRES_IN || "365d" }
        );
        return successResponse(res, "Vendor created successfully", 201, {
            user: savedVendor,
            token: token,
            role: savedUser?.role,
        }); // 201 = Created
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.VendorGetId = catchAsync(async (req, res) => {
    try {
        const _id = req.user.id;
        console.log(req.params)
        console.log
        console.log("vendorId:", _id);
        console.log("_id", _id)
        let record = await Vendor.findOne({ user: _id })
            .populate("user")
            .populate("added_by")
            .populate("category")
            .populate("subcategory");

        if (!record) {
            return validationErrorResponse(res, "Vendor not found", 404);
        }

        const calcPercentage = (obj) => {
            const keys = Object.keys(obj);
            const total = keys.length;
            let filled = 0;

            keys.forEach((k) => {
                if (obj[k] !== null && obj[k] !== undefined && obj[k] !== "") {
                    filled++;
                }
            });

            return total > 0 ? Math.round((filled / total) * 100) : 0;
        };
        const documentObj = {
            business_logo: record.business_logo,
            aadhaar_front: record.aadhaar_front,
            aadhaar_back: record.aadhaar_back,
            pan_card_image: record.pan_card_image,
            gst_certificate: record.gst_certificate,
            shop_license: record.shop_license,
            aadhaar_verify: record.aadhaar_verify,
            pan_card_verify: record.pan_card_verify,
            gst_certificate_verify: record.gst_certificate_verify,
        };

        const businessObj = {
            business_name: record.business_name,
            category: record.category,
            subcategory: record.subcategory,
            business_register: record.business_register,
            pan_card: record.pan_card,
            gst_number: record.gst_number,
            address: record.address,
            city: record.city,
            area: record.area,
            pincode: record.pincode,
            lat: record.lat,
            long: record.long,
            landmark: record.landmark,
            business_image: record.business_image,
            state: record.state,
            email: record?.vendor?.email,
            country: record?.country
        };

        const timingObj = {
            opening_hours: record.opening_hours,
            weekly_off_day: record.weekly_off_day,
        };

        const vendorObj = {
            vendor: record.user,
            sales: record.added_by,
        };
        const percentages = {
            document: calcPercentage(documentObj),
            business_details: calcPercentage(businessObj),
            timing: calcPercentage(timingObj),
            vendor_sales: calcPercentage(vendorObj),
        };

        console.log("vendorObj", vendorObj)
        const transformed = {
            _id: record._id,
            uuid: record.uuid,
            document: documentObj,
            business_details: businessObj,
            timing: timingObj,
            vendor: record.user,
            sales: record.added_by,
            status: record.status,
            Verify_status: record.Verify_status,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            percentages
        };

        return successResponse(res, "Vendor details fetched successfully", 200, transformed);

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.VendorGet = catchAsync(async (req, res) => {


    try {


        const vendors = await Vendor.find(query).populate("user");

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
        const vendor = req.user?.id || req.params.id;
        // console.log("vendorId:", vendor);
        const {
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
        const userData = await User.findByIdAndUpdate({ _id: vendor }, { email, name, avatar })
        const vendordata = await Vendor.findOneAndUpdate(
            { user: vendor },
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
                email
            },
            { new: true, runValidators: true }
        ).populate("user");

        console.log("vendordata", vendordata)
        if (!vendordata) {
            return validationErrorResponse(res, "Vendor not found", 404);
        }

        return successResponse(res, "Vendor updated successfully", 200, { vendordata });
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.vendorDelete = catchAsync(async (req, res) => {
    try {
        const vendorId = req.user?._id || req.params.id;
        console.log("req", req.params.id)
        const vendordata = await Vendor.findByIdAndUpdate(
            vendorId,
            { delete_At: new Date() },
            { new: true }
        );
        if (!vendordata) {
            return validationErrorResponse(res, "Vendor not found", 404);
        }
        return successResponse(res, "Vendor deleted successfully", 200, vendordata);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.VendorStatus = catchAsync(async (req, res) => {
    try {
        console.log(req.params)
        const offerId = req.params.id;
        const status = req.params.status;
        const records = await Vendor.findByIdAndUpdate(
            offerId,
            { Verify_status: status },
            { new: true }
        );
        const record = await User.findByIdAndUpdate(
            records?.vendor,
            { status: status === "unverify" ? "active" : "inactive" },
            { new: true }
        );
        if (!records) {
            return validationErrorResponse(res, "Status not found", 404);
        }
        return successResponse(res, "vendor status updated successfully", 201, record);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

// Offer Management 
// Add Offer 
exports.AddOffer = catchAsync(async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return validationErrorResponse(res, "UserId Not Found", 500);
        }

        const {
            title,
            description,
            expiryDate,
            image,
            discountPercentage,
            maxDiscountCap,
            minBillAmount,
            amount,
            type
        } = req.body;

        let offerRecord;

        if (type === "flat") {
            const newOffer = new FlatOffer({
                title,
                description,
                expiryDate,
                amount, // flat amount
                minBillAmount,
                offer_image: image,
                status: "active",
                maxDiscountCap, discountPercentage
            });
            offerRecord = await newOffer.save();
        } else if (type === "percentage") {
            const newOffer = new PercentageOffer({
                title,
                description,
                expiryDate,
                amount,
                discountPercentage,
                maxDiscountCap,
                minBillAmount,
                offer_image: image,
                status: "active"
            });
            offerRecord = await newOffer.save();
        } else {
            return validationErrorResponse(res, "Invalid offer type", 400);
        }

        const combinedOffer = new Offer({
            flat: type === "flat" ? offerRecord._id : null,
            percentage: type === "percentage" ? offerRecord._id : null,
            vendor: userId,
            type: type
        });

        const data = await combinedOffer.save();

        return successResponse(res, "Offer created successfully", 200, data);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

// Get Offer Id 
exports.GetOfferId = catchAsync(async (req, res) => {
    try {
        const offerId = req.params.id;
        const record = await Offer.findById({ _id: offerId }).populate("vendor").populate("flat").populate("percentage");
        console.log("record", record)
        if (!record) {
            return validationErrorResponse(res, "Offer not found", 404);
        }
        return successResponse(res, "Offer Get Details successfully", 200, {
            record: record,
            redeem: 35,
            purchase: 15,
            pending: 20
        });
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

// Offer Get 
exports.GetOffer = catchAsync(async (req, res) => {
    try {
        const userId = req.user?.id;
        const record = await Offer.find({ vendor: userId }).populate("flat").populate("percentage");
        if (!record) {
            return validationErrorResponse(res, "Offer not found", 404);
        }
        return successResponse(res, "Offer details fetched successfully", 200, record);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});
// Offer Status 
exports.OfferStatus = catchAsync(async (req, res) => {
    try {
        console.log(req.params)
        const offerId = req.params.id;
        const status = req.params.status;
        const record = await Offer.findByIdAndUpdate(
            offerId,
            { status },
            { new: true }
        );
        if (!record) {
            return validationErrorResponse(res, "Offer not found", 404);
        }
        return successResponse(res, "Offer status updated successfully", 201, record);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

// Offer Delete  
exports.OfferDelete = catchAsync(async (req, res) => {
    try {
        const offerId = req.params.id;
        console.log("Offer ID:", offerId);

        // Find the offer first
        const offer = await Offer.findById(offerId);
        console.log("Offer found:", offer);

        if (!offer) {
            return validationErrorResponse(res, "Offer not found", 404);
        }

        if (offer.type === "flat") {
            if (offer.flat) {
                await FlatOffer.findByIdAndDelete(offer.flat);
            }
        } else if (offer.type === "percentage") {
            if (offer.percentage) {
                await PercentageOffer.findByIdAndDelete(offer.percentage);
            }
        }

        // Delete the offer itself
        const deletedOffer = await Offer.findByIdAndDelete(offerId);

        return successResponse(res, "Offer deleted successfully", 200, deletedOffer);
    } catch (error) {
        console.error(error);
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

// Edit Offer 
exports.EditOffer = catchAsync(async (req, res) => {
    try {
        const Id = req.params.id;
        console.log("Id", Id);

        const {
            title,
            description,
            expiryDate,
            image,
            discountPercentage,
            maxDiscountCap,
            minBillAmount,
            amount,
        } = req.body;

        const record = await Offer.findById(Id);
        console.log("record", record);

        if (!record) {
            return errorResponse(res, "Offer not found", 404);
        }

        let offers;

        if (record.type === "flat") {
            offers = await FlatOffer.findByIdAndUpdate(
                record.flat,
                {
                    title,
                    description,
                    expiryDate,
                    image,
                    discountPercentage,
                    maxDiscountCap,
                    minBillAmount,
                    amount,
                },
                { new: true } // ✅ important: returns updated doc
            );
        } else {
            offers = await PercentageOffer.findByIdAndUpdate(
                record.percentage,
                {
                    title,
                    description,
                    expiryDate,
                    image,
                    discountPercentage,
                    maxDiscountCap,
                    minBillAmount,
                    amount,
                },
                { new: true } // ✅ important: returns updated doc
            );
        }

        console.log("updated offer", offers);
        return successResponse(res, "Offer updated successfully", 200, offers);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

// Category Management
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

exports.Dashboard = catchAsync(async (req, res) => {
    try {
        const userId = req.user.id;
        if (!userId) {
            return validationErrorResponse(res, "Please provide id", 404);
        }
        console.log("userId", userId);
        const Vendors = await Vendor.findOne({ user: userId })
        const record = await Offer.find({ vendor: userId }).populate("flat").populate("percentage").limit(6);
        return successResponse(res, "dashboard data fetched successfully", 200, {
            stats: {
                total_sales: 1500,
                redeemed_offeres: 10,
                pending_offers: 5,
                total_customers: 200,
            },
            offers: record,
            vendors: Vendors
        });
    } catch (error) {
        console.log("error", error)
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.AdminSubcaterites = catchAsync(async (req, res) => {
    try {
        const category_id = req.params.id
        console.log(category_id)
        const records = await categories.findOne({ _id: category_id });
        console.log("records", records)
        const Id = records.id
        const record = await SubCategory.find({ category_id: Id });
        if (!record) {
            return validationErrorResponse(res, "SubCategory not found", 404);
        }
        return successResponse(res, "SubCategory fetched successfully", 200, record);
    } catch (error) {
        console.log("error", error)
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.MarkOfferAsUsed = catchAsync(async (req, res) => {
    try {
        const offerId = req.params.id;
        const record = await OfferBuy.findByIdAndUpdate(
            offerId,
            { status: "redeemed" },
            { new: true }
        );
        if (!record) {
            return validationErrorResponse(res, "Offer not found", 404);
        }
        return successResponse(res, "Offer status updated successfully", 201, record);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});



exports.VendorOrder = catchAsync(async (req, res) => {
    try {
        const id = req?.user?.id;
        console.log("68edfeb22c5753929286bfa1", id)
        const record = await Payment.find({ vendor_id: id })
            .populate("user")
            .populate("Offer_id")
            .populate("vendor_id");

        if (!record) {
            return validationErrorResponse(res, "Offers not found", 404);
        }
        return successResponse(res, "Brought offers fetched successfully", 200, record);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);

    }
});


exports.Paymentvendor = catchAsync(async (req, res) => {
    try {
        const userid = req.user.id
        const offerId = req.params.id;
        const record = await Payment.findByIdAndUpdate(
            offerId ,  userid,
            { status: "redeemed" },
            { new: true }
        );
        if (!record) {
            return validationErrorResponse(res, "Offer not found", 404);
        }
        return successResponse(res, "Offer status updated successfully", 201, record);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.UpdateAmount = catchAsync(async (req, res) => {
  try {
    const vendor = req.user.id;
    const { final_amount, vendor_bill_status, offer ,user } = req.body;
    console.log(req.body ,  vendor)
    const record = await OfferBuy.findOneAndUpdate(
      { offer: offer, vendor: vendor  ,user: user}, 
      {
        final_amount,
        vendor_bill_status ,
      },
      { new: true } 
    );

    if (!record) {
      return validationErrorResponse(res, "Offer not found for this vendor", 404);
    }

    return successResponse(res, "Vendor amount updated successfully", 200, record);
  } catch (error) {
    console.log("Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});
