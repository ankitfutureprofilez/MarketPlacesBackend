const jwt = require("jsonwebtoken");
const User = require("../model/User");
const Vendor = require("../model/Vendor");
const Offer = require("../model/Offer.js");
const OfferBuy = require("../model/OfferBuy.js");
const catchAsync = require("../utils/catchAsync");
const { successResponse, errorResponse, validationErrorResponse } = require("../utils/ErrorHandling.js");
const categories = require("../model/categories.js");

exports.CustomerRegister = catchAsync(async (req, res) => {
    try {
        const {
            name,
            phone,
            email,
        } = req.body;

        if (!name || !phone) {
            return errorResponse(res, "Name and phone are required", 400);
        }

        const Users = await User.findOne({ phone: phone });
        if (Users) {
            return errorResponse(res, "Phone number already exists", 400,);
        }
        const userdata = new User({ name, phone, role: "customer", email });
        const savedUser = await userdata.save();
        if (!savedUser) {
            return errorResponse(res, "Failed to create user", 500);
        }
        const token = jwt.sign(
            { id: savedUser._id, role: savedUser.role, email: savedUser.email },
            process.env.JWT_SECRET_KEY,
            { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
        );
        return successResponse(res, "User created successfully", 201, {
            user: savedUser,
            token: token,
            role: savedUser?.role,
        });
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.CustomerGet = catchAsync(async (req, res) => {
    try {
        const userId = req.user.id;
        const customer = await User.findById(userId);
        if (!customer) {
            return errorResponse(res, "No customers found", 404);
        }
        return successResponse(res, "Customers retrieved successfully", 200, customer);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.VendorGet = catchAsync(async (req, res) => {
  try {
    const { category, name } = req.query;

    let vendors = await Vendor.find({})
      .populate("user")
      .populate("category")
      .populate("subcategory");

    // console.log("vendors", vendors);

    if (name || category) {
      const nameRegex = name ? new RegExp(name.trim(), "i") : null;
      const categoryRegex = category ? new RegExp(category.trim(), "i") : null;

      vendors = vendors.filter((item) => {
        const businessName = item.business_name || "";
        const catName = item?.category?.name || "";

        // only apply filters that exist
        const matchesName = nameRegex ? nameRegex.test(businessName) : true;
        const matchesCategory = categoryRegex ? categoryRegex.test(catName) : true;

        // return true only if all filters match
        return matchesName && matchesCategory;
      });
    }

    if (!vendors || vendors.length === 0) {
      return errorResponse(res, "No vendors found", 404);
    }

    return successResponse(res, "Vendor retrieved successfully", 200, vendors);
  } catch (error) {
    console.log("error", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.VendorOfferGet = catchAsync(async (req, res) => {
  try {
    // Correct way to get :id from route
    const userId = req.params.id;
    console.log("userId:", userId);

    const record = await Offer.find({ vendor: userId })
      .populate("flat")
      .populate("percentage");

    if (!record || record.length === 0) {
      return validationErrorResponse(res, "Offer not found", 404);
    }

    return successResponse(res, "Offer details fetched successfully", 200, record);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});


exports.GetOfferById = catchAsync(async (req, res) => {
    try {
        const offerId = req.params.id;
        console.log("offerId" ,offerId)
        const record = await Offer.findById({ _id: offerId }).populate("vendor").populate("flat").populate("percentage");
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

const getVendorsWithMaxOffer = async (vendors) => {
    return await Promise.all(
        vendors.map(async (vendor) => {
            // Fetch all active offers for the vendor
            const offers = await Offer.find({ vendor: vendor.user, status: "active" })
                .populate("flat")
                .populate("percentage");

            const activeOffersCount = offers.length;

            if (activeOffersCount === 0) {
                return { vendor, maxOffer: null, activeOffersCount: 0 };
            }

            // Calculate effective discount for each offer
            let maxOffer = null;
            let maxDiscountValue = -1;
            let maxOfferType = null;

            offers.forEach((offer) => {
                let discountValue = 0;

                if (offer.type === "flat" && offer.flat) {
                    discountValue = offer.flat.amount || 0;
                } else if (offer.type === "percentage" && offer.percentage) {
                    const percentage = offer.percentage.discountPercentage || 0;
                    const cap = offer.percentage.maxDiscountCap || 0;
                    // For simplicity, assume minBillAmount is met
                    discountValue = cap > 0 ? Math.min(cap, percentage) : percentage;
                }

                if (discountValue > maxDiscountValue) {
                    maxDiscountValue = discountValue;
                    maxOfferType = offer.type;
                }
            });

            return { 
                vendor, 
                maxOffer: maxDiscountValue > 0 ? { amount: maxDiscountValue, type: maxOfferType } : null, 
                activeOffersCount 
            };
        })
    );
};

exports.CustomerDashboard = catchAsync(async (req, res) => {
    try {
        const vendorsWithActiveOffers = await Offer.distinct("vendor", { status: "active" });
        // console.log("vendorsWithActiveOffers", vendorsWithActiveOffers);

        const popular = await Vendor.find({ user: { $in: vendorsWithActiveOffers } })
        .select("business_name address business_logo vendor category user subcategory")
        .populate("category")
        .populate("user")
        .populate("subcategory");
        console.log("popular", popular);
        const popularvendor = await getVendorsWithMaxOffer(popular);

        const nearby = await Vendor.find({ user: { $in: vendorsWithActiveOffers } })
            .select("business_name address business_logo vendor category user subcategory")
            .populate("category").populate("user").populate("category").populate("subcategory");
        const nearbyvendor = await getVendorsWithMaxOffer(nearby);

        // const categoriesdata = await Vendor.find({ user: { $in: vendorsWithActiveOffers } })
        //     .select("business_name address business_logo vendor category user subcategory")
        //     .populate("category").populate("user").populate("category").populate("subcategory");
        // const categoriesdatavendor = await getVendorsWithMaxOffer(categoriesdata);

        const category = await categories.find({});
        return successResponse(res, "Dashboard successfully", 200, {
            popularvendor,
            nearbyvendor,
            category,
            // categoriesdatavendor,
        });
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.OfferBrought = catchAsync(async (req, res) => {
    try {
        const id = req.params.id;
        const record = await OfferBuy.findById({ user: id }).populate("user").populate("offer").populate("percentage");
        if (!record) {
            return validationErrorResponse(res, "Offers not found", 404);
        }
        return successResponse(res, "Offer Get Details successfully", 200, record);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});