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
const { default: mongoose } = require("mongoose");
const deleteUploadedFiles = require("../utils/fileDeleter.js");

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
      lat,
      long,
      address,
      gst_number,
      opening_hours,
      weekly_off_day,
      business_register,
      email
    } = req.body;

    // 🔹 Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return errorResponse(res, "Phone number already exists", 400);
    }

    // 🔹 Uploaded files handling
    const uploadedFiles = req.files || {};
    const makeFileUrl = (fieldName) => {
      if (!uploadedFiles[fieldName] || uploadedFiles[fieldName].length === 0) return null;
      const file = uploadedFiles[fieldName][0];
      return `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
    };

    // 🔹 Create user first
    const user = new User({ name, phone, role: "vendor", email });
    const savedUser = await user.save();
    if (!savedUser) {
      return errorResponse(res, "Failed to create user", 500);
    }

    // 🔹 Safely cast category/subcategory to ObjectId (if valid)
    const safeObjectId = (val) => {
      if (!val) return null;
      const trimmed = val.trim();
      return mongoose.isValidObjectId(trimmed) ? new mongoose.Types.ObjectId(trimmed) : null;
    };

    // 🔹 Create vendor with file URLs
    const vendor = new Vendor({
      business_name,
      city,
      category: safeObjectId(category),
      subcategory: safeObjectId(subcategory),
      state,
      pincode,
      email,
      area,
      user: savedUser._id,
      added_by: null,
      address,
      lat,
      long,
      gst_number,
      opening_hours,
      weekly_off_day,
      business_register,
      aadhaar_front: makeFileUrl("aadhaar_front"),
      aadhaar_back: makeFileUrl("aadhaar_back"),
      pan_card_image: makeFileUrl("pan_card_image"),
      gst_certificate: makeFileUrl("gst_certificate"),
      business_logo: makeFileUrl("business_logo"),
    });

    const savedVendor = await vendor.save();
    if (!savedVendor) {
      return errorResponse(res, "Failed to create vendor", 500);
    }

    // 🔹 Generate JWT token
    const token = jwt.sign(
      { id: savedUser._id, role: savedUser.role, email: savedUser.email },
      process.env.JWT_SECRET_KEY,
      { expiresIn: process.env.JWT_EXPIRES_IN || "365d" }
    );

    return successResponse(res, "Vendor created successfully", 201, {
      user: savedVendor,
      token,
      role: savedUser.role,
    });

  } catch (error) {
    console.error("Vendor registration failed:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.VendorGetId = catchAsync(async (req, res) => {
  try {
    const _id = req.user.id;
    // console.log("vendorId:", _id);
    // console.log("_id", _id)
    let record = await Vendor.findOne({ user: _id })
      .populate("user")
      .populate("added_by")
      .populate("category")
      .populate("subcategory");

    if (!record) {
      return validationErrorResponse(res, "Vendor not found", 404);
    }
    // console.log("record", record);

    const calcPercentage = (obj) => {
      if (!obj || typeof obj !== "object") return 0;
      const keys = Object.keys(obj);
      const total = keys.length;
      if (total === 0) return 0;
      let filled = 0;
      keys.forEach((key) => {
        const value = obj[key];
        if (value === null || value === undefined || value === "") return;
        if (Array.isArray(value)) {
          if (value.length > 0) filled++;
          return;
        }
        if (typeof value === "object") {
          if (Object.keys(value).length > 0) filled++;
          return;
        }
        filled++;
      });
      return Math.round((filled / total) * 100);
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
      aadhaar_reason: record?.aadhaar_reason,
      gst_certificate_reason: record?.gst_certificate_reason,
      pan_card_reason: record?.pan_card_reason,
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
    const vendorId = req.user?.id || req.params.id;

    if (!vendorId) {
      return validationErrorResponse(res, "Vendor ID missing", 400);
    }

    // -----------------------------
    // 1) Handle uploaded files
    // -----------------------------
    const uploadedFiles = req.files || {};

    const makeFileUrl = (fieldName) => {
      if (!uploadedFiles[fieldName] || uploadedFiles[fieldName].length === 0)
        return undefined; // IMPORTANT → undefined means do not update field

      const file = uploadedFiles[fieldName][0];
      return `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
    };

    // -----------------------------
    // 2) Parse body fields
    // -----------------------------
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
      gst_number,
      opening_hours,
      weekly_off_day,
      business_register,
      email,
      avatar
    } = req.body;

    // -----------------------------
    // 3) Safe ObjectId casting
    // -----------------------------
    const safeObjectId = (val) => {
      if (!val) return undefined;
      return mongoose.isValidObjectId(val.trim())
        ? new mongoose.Types.ObjectId(val.trim())
        : undefined;
    };

    // -----------------------------
    // 4) Update User model
    // -----------------------------
    await User.findByIdAndUpdate(
      vendorId,
      { name, email, avatar },
      { new: true }
    );

    // -----------------------------
    // 5) Prepare vendor update payload
    // -----------------------------
    const vendorUpdateData = {
      business_name,
      city,
      state,
      category: safeObjectId(category),
      subcategory: safeObjectId(subcategory),
      pincode,
      area,
      name,
      phone,
      lat,
      long,
      address,
      gst_number,
      opening_hours,
      weekly_off_day,
      business_register,
      email,

      // Update only if new file uploaded
      aadhaar_front: makeFileUrl("aadhaar_front"),
      aadhaar_back: makeFileUrl("aadhaar_back"),
      pan_card_image: makeFileUrl("pan_card_image"),
      gst_certificate: makeFileUrl("gst_certificate"),
      business_logo: makeFileUrl("business_logo"),
    };

    // Remove undefined fields (means frontend didn't send + no file uploaded)
    Object.keys(vendorUpdateData).forEach((key) => {
      if (vendorUpdateData[key] === undefined) delete vendorUpdateData[key];
    });

    // -----------------------------
    // 6) Update Vendor model
    // -----------------------------
    const vendordata = await Vendor.findOneAndUpdate(
      { user: vendorId },
      vendorUpdateData,
      { new: true, runValidators: true }
    ).populate("user");

    if (!vendordata) {
      return validationErrorResponse(res, "Vendor not found", 404);
    }

    return successResponse(res, "Vendor updated successfully", 200, {
      vendordata,
    });

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
      discountPercentage,
      maxDiscountCap,
      minBillAmount,
      amount,
      type
    } = req.body;

    // ✅ Check if file is present
    if (!req.file || !req.file.filename) {
      return validationErrorResponse(res, "Image file is required", 400);
    }

    // ✅ Construct the public file URL (same pattern as CustomerAddBill)
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    // ✅ Create offer based on type
    let offerRecord;

    if (type === "flat") {
      const newOffer = new FlatOffer({
        title,
        description,
        expiryDate,
        amount, // flat amount
        minBillAmount,
        offer_image: fileUrl,
        status: "active",
        maxDiscountCap,
        discountPercentage
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
        offer_image: fileUrl,
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
    const {
      title,
      description,
      expiryDate,
      discountPercentage,
      maxDiscountCap,
      minBillAmount,
      amount,
    } = req.body;

    const record = await Offer.findById(Id);
    if (!record) {
      return errorResponse(res, "Offer not found", 404);
    }

    const updateData = {
      title,
      description,
      expiryDate,
      discountPercentage,
      maxDiscountCap,
      minBillAmount,
      amount,
    };

    if (req.file && req.file.filename) {
      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
      updateData.offer_image = fileUrl;
    }

    let updatedOffer;
    if (record.type === "flat") {
      updatedOffer = await FlatOffer.findByIdAndUpdate(record.flat, updateData, {
        new: true,
      });
    } else {
      updatedOffer = await PercentageOffer.findByIdAndUpdate(
        record.percentage,
        updateData,
        { new: true }
      );
    }

    return successResponse(res, "Offer updated successfully", 200, updatedOffer);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

// Category Management
exports.category = catchAsync(async (req, res) => {
  try {
    const record = await categories.find({ deleted_at: null });
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
    const category_id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(category_id)) {
      return validationErrorResponse(res, "Invalid Category ID", 400);
    }
    const record = await SubCategory.find({
      category_id,
      deleted_at: null
    });
    if (!record || record.length === 0) {
      return validationErrorResponse(res, "SubCategory not found", 200);
    }
    return successResponse(res, "SubCategory fetched successfully", 200, record);
  } catch (error) {
    console.log("error", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.Dashboard = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return validationErrorResponse(res, "Please provide id", 404);
    }

    const Vendors = await Vendor.findOne({ user: userId });

    // ✅ Aggregation for overall stats
    const offerBuyStats = await OfferBuy.aggregate([
      { $match: { vendor: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$final_amount" },
          users: { $addToSet: "$user" },
          redeemedCount: {
            $sum: { $cond: [{ $eq: ["$vendor_bill_status", true] }, 1, 0] },
          },
        },
      },
    ]);

    const statsData = offerBuyStats[0] || {
      totalSales: 0,
      users: [],
      redeemedCount: 0,
    };

    const activeOffersCount = await Offer.countDocuments({
      vendor: userId,
      status: "active",
    });

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6);

    // ✅ Fetch offer sales grouped by day (last 7 days)
    const dailySales = await OfferBuy.aggregate([
      {
        $match: {
          vendor: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: sevenDaysAgo, $lte: now },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          offers_sold: { $sum: 1 },
        },
      },
      { $sort: { "_id": 1 } },
    ]);

    // ✅ Ensure all 7 days are present even if 0 sales
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayKey = d.toISOString().split("T")[0];
      const match = dailySales.find((x) => x._id === dayKey);
      last7Days.push({
        date: dayKey,
        offers_sold: match ? match.offers_sold : 0,
      });
    }

    // ✅ Last 5 Purchases
    const lastFivePurchases = await OfferBuy.find({ vendor: userId })
      .populate("user", "name email")
      .populate({
        path: "offer",
        populate: [
          { path: "flat" },
          { path: "percentage" },
        ],
      })
      .populate("payment_id", "amount status method")
      .sort({ createdAt: -1 })
      .limit(5);

    // ✅ Top 3 Offers (with populated data)
    const topOffers = await OfferBuy.aggregate([
      { $match: { vendor: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$offer",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      // { $limit: 3 },
      {
        $lookup: {
          from: "offers",
          localField: "_id",
          foreignField: "_id",
          as: "offerDetails",
        },
      },
      { $unwind: "$offerDetails" },
      {
        $lookup: {
          from: "flats",
          localField: "offerDetails.flat",
          foreignField: "_id",
          as: "offerDetails.flat",
        },
      },
      {
        $lookup: {
          from: "percentageoffers",
          localField: "offerDetails.percentage",
          foreignField: "_id",
          as: "offerDetails.percentage",
        },
      },
      {
        $addFields: {
          "offerDetails.flat": { $arrayElemAt: ["$offerDetails.flat", 0] },
          "offerDetails.percentage": { $arrayElemAt: ["$offerDetails.percentage", 0] },
        },
      },
      {
        $project: {
          _id: 0,
          offer: "$offerDetails",
          title: "$offerDetails.title",
          count: 1,
        },
      },
    ]);

    // ✅ Final Response
    return successResponse(res, "Dashboard data fetched successfully", 200, {
      stats: {
        total_sales: statsData.totalSales || 0,
        redeemed_offeres: statsData.redeemedCount || 0,
        active_offers: activeOffersCount || 0,
        total_customers: statsData.users.length || 0,
      },
      last_7_days_sales: last7Days, // 👈 this replaces the number-only stat
      vendors: Vendors,
      last_five_purchases: lastFivePurchases,
      top_offers: topOffers,
    });
  } catch (error) {
    console.log("error", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.AdminSubcaterites = catchAsync(async (req, res) => {
  try {
    const category_id = req.params.id;

    const record = await SubCategory.find({
      category_id: category_id,
      deleted_at: null
    });

    if (!record || record.length === 0) {
      return validationErrorResponse(res, "SubCategory not found", 404);
    }

    return successResponse(res, "SubCategory fetched successfully", 200, record);
  } catch (error) {
    console.log("error", error);
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
    const vendorId = req?.user?.id;

    if (!vendorId) {
      return validationErrorResponse(res, "Vendor not authenticated", 401);
    }
    const allPurchases = await OfferBuy.find({ vendor: vendorId })
      .populate("user", "name email phone")
      .populate({
        path: "offer",
        populate: [{ path: "flat" }, { path: "percentage" }],
      })
      .populate("payment_id")
      .sort({ createdAt: -1 });

    if (!allPurchases || allPurchases.length === 0) {
      return validationErrorResponse(res, "No purchases found for this vendor", 404);
    }

    const offerStats = {};
    let total_customers = 0;

    allPurchases.forEach((purchase) => {
      const offer = purchase.offer;
      if (!offer) return;

      const offerId = offer._id.toString();

      if (!offerStats[offerId]) {
        offerStats[offerId] = {
          offer_id: offer._id,
          offer_title:
            offer.percentage?.title ||
            offer.flat?.title ||
            offer.title ||
            "Untitled Offer",
          offer_type: offer.type || "General",
          offer_status: purchase.status || "active",
          isExpired:
            new Date() >
            new Date(
              offer.percentage?.expiryDate ||
              offer.flat?.expiryDate ||
              offer.expiry_date ||
              Date.now()
            ),
          total_revenue: 0,
          total_customers: 0,
          purchased_customers: [],
        };
      }

      offerStats[offerId].total_revenue += purchase.final_amount || 0;
      // offerStats[offerId].total_revenue += purchase.payment_id?.amount || 0;
      offerStats[offerId].total_customers += 1;
      total_customers += 1;
    });

    const allOffers = Object.values(offerStats);

    const total_offers = allOffers.length;

    return successResponse(res, "Vendor purchase history fetched successfully", 200, {
      total_offers,
      total_customers,
      data: allOffers,
    });
  } catch (error) {
    console.error("VendorOrder error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getPurchasedCustomers = catchAsync(async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { offerId, page = 1, limit = 20 } = req.query;
    // ✅ Validate inputs
    if (!vendorId || !offerId) {
      return validationErrorResponse(res, "Vendor ID and Offer ID are required.", 404);
    }

    // ✅ Build query
    const query = {
      vendor: new mongoose.Types.ObjectId(vendorId),
      offer: new mongoose.Types.ObjectId(offerId),
    };
    console.log("query", query)
    // ✅ Pagination
    const skip = (page - 1) * limit;

    // ✅ Fetch records
    const allPurchases = await OfferBuy.find(query)
      .populate("user", "name email phone")
      .populate({
        path: "offer",
        // select: "title description discountPercentage", // only needed fields
        populate: [
          { path: "flat", select: "title discount" },
          { path: "percentage", select: "title discount" },
        ],
      })
      .populate({
        path: "payment_id",
        // select: "payment_id method amount currency status createdAt",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // console.log("allPurchases", allPurchases)
    // ✅ Count total records
    const total_records = await OfferBuy.countDocuments(query);
    const total_pages = Math.ceil(total_records / limit);

    if (!allPurchases.length) {
      return validationErrorResponse(res, "No purchase found", 404);
    }

    // ✅ Format response
    // const purchased_customers = allPurchases.map((purchase) => ({
    //     offer_buy: {
    //         purchase_id: purchase._id,
    //         final_amount: purchase.final_amount,
    //         status: purchase.status,
    //         vendor_bill_status: purchase.vendor_bill_status,
    //         description: purchase?.description || "",
    //         createdAt: purchase?.createdAt || ""
    //     },
    //     customer: {
    //         id: purchase.user?._id,
    //         name: purchase.user?.name,
    //         email: purchase.user?.email,
    //         phone: purchase.user?.phone,
    //     },
    //     payment: {
    //         id: purchase.payment_id?._id,
    //         payment_id: purchase.payment_id?.payment_id,
    //         method: purchase.payment_id?.method,
    //         amount: purchase.payment_id?.amount,
    //         currency: purchase.payment_id?.currency,
    //         status: purchase.payment_id?.status,
    //         date: purchase.payment_id?.createdAt,
    //     },
    // }));


    return successResponse(res, "Vendor amount updated successfully", 200, {
      purchased_customers: allPurchases,
      total_records,
      current_page: Number(page),
      per_page: Number(limit),
      total_pages,
      nextPage: page < total_pages ? Number(page) + 1 : null,
      previousPage: page > 1 ? Number(page) - 1 : null,
    });
  } catch (error) {
    console.error("Error fetching purchased customers:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

exports.Paymentvendor = catchAsync(async (req, res) => {
  try {
    const userid = req.user.id
    const offerId = req.params.id;
    const record = await Payment.findByIdAndUpdate(
      offerId, userid,
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
    const { id } = req.params;
    const { total_amount, vendor_bill_status } = req.body;

    if (!id) {
      return validationErrorResponse(res, "Missing offer ID", 400);
    }

    if (total_amount === undefined || total_amount === null) {
      return validationErrorResponse(res, "Total amount is required", 400);
    }

    // Fetch record + offer details (same as Function 2)
    const record = await OfferBuy.findById(id).populate({
      path: "offer",
      populate: [{ path: "flat" }, { path: "percentage" }]
    });

    if (!record) {
      return validationErrorResponse(res, "Offer not found for this vendor", 404);
    }

    let discount = record.discount || 0;
    let final = total_amount;

    // ----------------------------------------------
    // ✔ APPLY OFFER LOGIC ONLY IF TOTAL AMOUNT CHANGED
    // ----------------------------------------------
    if (record.total_amount !== total_amount) {
      if (record?.offer?.type === "percentage") {
        const offerData = record.offer.percentage;

        if (total_amount < offerData.minBillAmount) {
          return validationErrorResponse(
            res,
            `Minimum bill amount should be ₹${offerData.minBillAmount} to apply this offer.`,
            400
          );
        }

        discount = Math.min(
          offerData.maxDiscountCap,
          (offerData.discountPercentage * total_amount) / 100
        );

        final = total_amount - discount;
      }
      else if (record?.offer?.type === "flat") {
        const offerData = record.offer.flat;

        if (total_amount < offerData.minBillAmount) {
          return validationErrorResponse(
            res,
            `Minimum bill amount should be ₹${offerData.minBillAmount} to apply this offer.`,
            400
          );
        }

        discount = offerData.discountPercentage;
        final = total_amount - discount;
      }
      else {
        console.log("Invalid offer type");
      }
    }

    // ----------------------------------------------
    // ✔ Update the record (same as before)
    // ----------------------------------------------
    record.total_amount = total_amount;
    record.vendor_bill_status = true;
    record.used_time = new Date();

    // Update calculated discount + final amount
    record.discount = discount;
    record.final_amount = final;

    await record.save();

    return successResponse(res, "Vendor amount updated successfully", 200, record);
  } catch (error) {
    console.error("Error updating amount:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

// updatekarna hai 
exports.PaymentDetails = catchAsync(async (req, res) => {
  try {
    const vendor = req.user.id;
    const { final_amount, vendor_bill_status, offer, user } = req.body;
    console.log(req.body, vendor)
    const record = await OfferBuy.findOneAndUpdate(
      { offer: offer, vendor: vendor, user: user },
      {
        final_amount,
        vendor_bill_status,
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

exports.getPayments = catchAsync(async (req, res) => {
  try {
    const vendor = req.user.id;
    const { id } = req.params;
    const record = await OfferBuy.findById(id)
      .populate('user').populate({
        path: "offer",
        populate: [
          { path: "flat", },
          { path: "percentage", },
        ],
      }).populate('vendor').populate('payment_id');
    if (!record) {
      return validationErrorResponse(res, "Payment not found", 404);
    }
    return successResponse(res, "Payments fetched successfully", 200, record);
  } catch (error) {
    console.log("Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.uploadGallery = catchAsync(async (req, res) => {
  try {
    const user = req.user.id;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }
    const fileUrls = req.files.map(
      (file) => `${req.protocol}://${req.get("host")}/uploads/${file.filename}`
    );
    const vendor = await Vendor.findOne({ user: user });
    if (!vendor) {
      return validationErrorResponse(res, "Vendor not found", 404);
    }
    // ✅ Ensure vendor.gallery exists and is an array
    if (!Array.isArray(vendor.business_image)) {
      vendor.business_image = [];
    }
    vendor.business_image = vendor.business_image.concat(fileUrls);
    await vendor.save();
    res.json({
      message: "Files uploaded successfully",
      count: req.files.length,
      data: fileUrls,
    });
  } catch (error) {
    console.log("Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getGallery = catchAsync(async (req, res) => {
  try {
    const user = req.user.id;
    const data = await Vendor.findOne({ user: user }).select('business_image');
    if (!data) {
      return validationErrorResponse(res, "Vendor not found", 404);
    }
    return successResponse(res, "Gallery fetched successfully", 200, data);
  } catch (error) {
    console.log("Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.deleteGallery = catchAsync(async (req, res) => {
  try {
    const user = req.user.id;
    const { files } = req.body; // expecting an array of file URLs

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: "No files provided" });
    }

    const vendor = await Vendor.findOne({ user });
    if (!vendor) {
      return validationErrorResponse(res, "Vendor not found", 404);
    }

    // ✅ Ensure vendor.gallery exists and is an array
    if (!Array.isArray(vendor.business_image)) {
      vendor.business_image = [];
    }

    // Delete the physical files from the server
    deleteUploadedFiles(files);

    // Filter out deleted files from vendor.business_image
    vendor.business_image = vendor.business_image.filter(
      (imageUrl) => !files.includes(imageUrl)
    );

    await vendor.save();

    res.json({
      message: "Files deleted successfully",
      deletedCount: files.length,
      remainingbusiness_image: vendor.business_image,
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});


exports.vendorphoneUpdate = catchAsync(async (req, res) => {
  try {
    const vendorId = req.user?.id || req.params.id;

    if (!vendorId) {
      return validationErrorResponse(res, "Vendor ID missing", 400);
    }

   const { phone, otp } = req.body;
   if (!otp) {
     return validationErrorResponse(res, "Phone number is required", 401);
   }
   if(otp !== "123456"){
      return validationErrorResponse(res, "Invalid OTP", 400);
   }
    const vendordata = await User.findByIdAndUpdate(
      vendorId,
      { phone },
      { new: true }
    );



    return successResponse(res, "Vendor updated successfully", 200, {
      vendordata,
    });

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});