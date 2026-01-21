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

const ADDRESS_PROOFS = [
  "aadhaar_front",
  "aadhaar_back",
  "pan_card_image",
  "driving_license",
  "passport",
];

const BUSINESS_PROOFS = [
  "gst_certificate",
  "udhyam",
  "trade_license",
  "shop_license",
];

exports.VendorRegister = catchAsync(async (req, res) => {
  try {
    let {
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

    // Normalize weekly_off_day
    if (weekly_off_day) {
      if (typeof weekly_off_day === "string") {
        try {
          weekly_off_day = JSON.parse(weekly_off_day);
        } catch (err) {
          return errorResponse(res, "Invalid weekly_off_day format", 400);
        }
      }
      if (!Array.isArray(weekly_off_day)) {
        return errorResponse(res, "weekly_off_day must be an array", 400);
      }
      weekly_off_day = weekly_off_day
        .map(d => new Date(d))
        .filter(d => !isNaN(d.getTime())); // remove invalid dates
    }


    // 🔹 Uploaded files handling
    const uploadedFiles = req.files || {};

    // 🔹 Validate document uploads
    const hasAtLeastOneFile = (keys) =>
      keys.some(
        (key) =>
          uploadedFiles[key] &&
          Array.isArray(uploadedFiles[key]) &&
          uploadedFiles[key].length > 0
      );

    const hasAddressProof = hasAtLeastOneFile(ADDRESS_PROOFS);
    const hasBusinessProof = hasAtLeastOneFile(BUSINESS_PROOFS);

    if (!hasAddressProof) {
      return errorResponse(res, "At least one address proof document is required", 400);
    }

    if (!hasBusinessProof) {
      return errorResponse(res, "At least one business proof document is required",400);
    }

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
      // Address proofs
      aadhaar_front: makeFileUrl("aadhaar_front"),
      aadhaar_back: makeFileUrl("aadhaar_back"),
      pan_card_image: makeFileUrl("pan_card_image"),
      driving_license: makeFileUrl("driving_license"),
      passport: makeFileUrl("passport"),
      // Business proofs
      gst_certificate: makeFileUrl("gst_certificate"),
      udhyam: makeFileUrl("udhyam"),
      trade_license: makeFileUrl("trade_license"),
      shop_license: makeFileUrl("shop_license"),
      // Business logo
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
        if (value instanceof Date && !isNaN(value)) {
          filled++;
          return;
        }
        if (value?._bsontype === "ObjectID") {
          filled++;
          return;
        }
        if (Array.isArray(value)) {
          if (value.length > 0) filled++;
          return;
        }
        if (typeof value === "function") return;
        if (typeof value === "object") {
          if (Object.keys(value).length > 0) filled++;
          return;
        }
        filled++;
      });

      return Math.round((filled / total) * 100);
    };

    const documentObj = {
      business_logo: record?.business_logo ?? null,

      aadhaar_front: record?.aadhaar_front ?? null,
      aadhaar_back: record?.aadhaar_back ?? null,
      pan_card_image: record?.pan_card_image ?? null,
      gst_certificate: record?.gst_certificate ?? null,
      shop_license: record?.shop_license ?? null,
      driving_license: record?.driving_license ?? null,
      passport: record?.passport ?? null,
      udhyam: record?.udhyam ?? null,
      trade_license: record?.trade_license ?? null,
      // Verification status
      aadhaar_verify: record?.aadhaar_verify ?? "pending",
      pan_card_verify: record?.pan_card_verify ?? "pending",
      gst_certificate_verify: record?.gst_certificate_verify ?? "pending",
      shop_license_verify: record?.shop_license_verify ?? "pending",
      driving_license_verify: record?.driving_license_verify ?? "pending",
      passport_verify: record?.passport_verify ?? "pending",
      udhyam_verify: record?.udhyam_verify ?? "pending",
      trade_license_verify: record?.trade_license_verify ?? "pending",
      // Rejection reasons
      aadhaar_reason: record?.aadhaar_reason ?? null,
      pan_card_reason: record?.pan_card_reason ?? null,
      gst_certificate_reason: record?.gst_certificate_reason ?? null,
      shop_license_reason: record?.shop_license_reason ?? null,
      driving_license_reason: record?.driving_license_reason ?? null,
      passport_reason: record?.passport_reason ?? null,
      udhyam_reason: record?.udhyam_reason ?? null,
      trade_license_reason: record?.trade_license_reason ?? null,
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

    // const vendorObj = {
    //   vendor: record.user,
    //   sales: record.added_by,
    // };

    const docPercentage = (documentObj?.business_logo === "" || documentObj?.business_logo == null) ? 20 : 25;
    const timingPercentage = timingObj?.opening_hours && Object.keys(timingObj.opening_hours).length > 1 ? 25 : 0;
    const imageCount = businessObj?.business_image?.length || 0;
    const imagePercentage = imageCount > 4 ? 25 : Math.round((imageCount / 4) * 25);
    
    const percentages = {
      business_details: 25,
      document: docPercentage,
      timing: timingPercentage,
      business_images: imagePercentage,
    };

    // console.log("vendorObj", vendorObj)
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
      return validationErrorResponse(res, "No vendors found", 200);
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

    const user = await User.findById(vendorId);

    if(user?.deleted_at){
      return validationErrorResponse(res, "Your account is blocked", 403);
    }

    const uploadedFiles = req.files || {};

    const existingVendor = await Vendor.findOne({ user: vendorId });
    if (!existingVendor) {
      return validationErrorResponse(res, "Vendor not found", 204);
    }
    const hasProofAfterUpdate = (keys) => {
      return keys.some((key) => {
        // new upload in this request
        if (
          uploadedFiles[key] &&
          Array.isArray(uploadedFiles[key]) &&
          uploadedFiles[key].length > 0
        ) {
          return true;
        }

        // already exists in DB
        return !!existingVendor[key];
      });
    };

    const hasAddressProof = hasProofAfterUpdate(ADDRESS_PROOFS);
    const hasBusinessProof = hasProofAfterUpdate(BUSINESS_PROOFS);

    if (!hasAddressProof) {
      return validationErrorResponse(res,"At least one address proof document must be available",400);
    }

    if (!hasBusinessProof) {
      return validationErrorResponse(res,"At least one business proof document must be available",400);
    }

    const makeFileUrl = (fieldName) => {
      if (!uploadedFiles[fieldName] || uploadedFiles[fieldName].length === 0)
        return undefined; // IMPORTANT → undefined means do not update field

      const file = uploadedFiles[fieldName][0];
      return `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
    };

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

    let normalizedWeeklyOffDay;

    if (weekly_off_day !== undefined) {
      let parsedValue = weekly_off_day;

      // If multipart/form-data sends it as string
      if (typeof parsedValue === "string") {
        try {
          parsedValue = JSON.parse(parsedValue);
        } catch (err) {
          return validationErrorResponse(
            res,
            "Invalid weekly_off_day format. Must be an array of dates",
            400
          );
        }
      }

      if (!Array.isArray(parsedValue)) {
        return validationErrorResponse(
          res,
          "weekly_off_day must be an array",
          400
        );
      }

      normalizedWeeklyOffDay = parsedValue
        .map((d) => new Date(d))
        .filter((d) => !isNaN(d.getTime()));

      // Optional: strict mode (reject if any invalid date was sent)
      if (normalizedWeeklyOffDay.length !== parsedValue.length) {
        return validationErrorResponse(
          res,
          "weekly_off_day contains invalid date values",
          400
        );
      }
    }

    const safeObjectId = (val) => {
      if (!val) return undefined;
      return mongoose.isValidObjectId(val.trim())
        ? new mongoose.Types.ObjectId(val.trim())
        : undefined;
    };

    await User.findByIdAndUpdate(
      vendorId,
      { name, email, avatar },
      { new: true }
    );

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
      weekly_off_day: normalizedWeeklyOffDay,
      business_register,
      email,

      // Update only if new file uploaded
      // Address proofs
      aadhaar_front: makeFileUrl("aadhaar_front"),
      aadhaar_back: makeFileUrl("aadhaar_back"),
      pan_card_image: makeFileUrl("pan_card_image"),
      driving_license: makeFileUrl("driving_license"),
      passport: makeFileUrl("passport"),

      // Business proofs
      gst_certificate: makeFileUrl("gst_certificate"),
      udhyam: makeFileUrl("udhyam"),
      trade_license: makeFileUrl("trade_license"),
      shop_license: makeFileUrl("shop_license"),
      business_logo: makeFileUrl("business_logo"),
    };

    // Remove undefined fields (means frontend didn't send + no file uploaded)
    Object.keys(vendorUpdateData).forEach((key) => {
      if (vendorUpdateData[key] === undefined) delete vendorUpdateData[key];
    });

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
    // console.log(req.params)
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

const safeJsonParse = (value) => {
  if (!value) return undefined;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (err) {
      throw new Error("Invalid JSON format for inclusion/exclusion");
    }
  }
  return value; // already an object/array
};

const calculateOfferAmount = ({ type, discountPercentage, maxDiscountCap }) => {
  let baseValue = 0;
  if (type === "flat") {
    if (!discountPercentage || discountPercentage <= 0) return 20;
    baseValue = discountPercentage * 0.10;
  }
  if (type === "percentage") {
    if (!maxDiscountCap || maxDiscountCap <= 0) return 20;
    baseValue = maxDiscountCap * 0.10;
  }
  const roundedToNearest10 = Math.ceil(baseValue / 10) * 10;
  return Math.max(roundedToNearest10, 20);
};

// Add Offer 
exports.AddOffer = catchAsync(async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return validationErrorResponse(res, "UserId Not Found", 400);
    }

    const user = await User.findById(userId);

    if(user?.deleted_at){
      return validationErrorResponse(res, "Your account is blocked", 403);
    }

    let {
      title,
      description,
      expiryDate,
      discountPercentage,
      maxDiscountCap,
      minBillAmount,
      // amount,
      type,
      inclusion,
      exclusion,
    } = req.body;

    inclusion = safeJsonParse(inclusion);
    exclusion = safeJsonParse(exclusion);

    // ✅ Check if file is present
    if (!req.file || !req.file.filename) {
      return validationErrorResponse(res, "Image file is required", 400);
    }

    // ✅ Construct the public file URL (same pattern as CustomerAddBill)
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    // ✅ Create offer based on type
    let offerRecord;

    const amount = calculateOfferAmount({
      type,
      discountPercentage,
      maxDiscountCap,
    });

    if (type === "flat") {
      const newOffer = new FlatOffer({
        title,
        description,
        expiryDate,
        amount, 
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
      type: type,
      inclusion,
      exclusion
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

    const record = await Offer.findById(offerId)
      .populate("vendor")
      .populate("flat")
      .populate("percentage");

    if (!record) {
      return validationErrorResponse(res, "Offer not found", 404);
    }

    // ---- STATS FROM OfferBuy ----
    const [
      totalPurchases,
      billedCount,
      unbilledCount
    ] = await Promise.all([
      OfferBuy.countDocuments({ offer: offerId }),
      OfferBuy.countDocuments({ offer: offerId, vendor_bill_status: true }),
      OfferBuy.countDocuments({ offer: offerId, vendor_bill_status: false })
    ]);

    return successResponse(res, "Offer details retrieved successfully", 200, {
      record,
      redeem: billedCount,
      purchase: totalPurchases,
      pending: unbilledCount
    });

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

// Offer Get 
exports.GetOffer = catchAsync(async (req, res) => {
  try {
    const userId = req.user?.id;
    const record = await Offer.find({ vendor: userId }).populate("flat").populate("percentage").sort({ createdAt: -1 });;
    if (!record) {
      return validationErrorResponse(res, "Offer not found", 200);
    }
    return successResponse(res, "Offer details fetched successfully", 200, record);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});
// Offer Status 
exports.OfferStatus = catchAsync(async (req, res) => {
  try {
    // console.log(req.params)
    const offerId = req.params.id;
    const status = req.params.status;
    const user = await User.findById(req.user.id);

    if(user?.deleted_at){
      return validationErrorResponse(res, "Your account is blocked", 403);
    }
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
    // console.log("Offer ID:", offerId);

    const user = await User.findById(req.user.id);

    if(user?.deleted_at){
      return validationErrorResponse(res, "Your account is blocked", 403);
    }

    // Find the offer first
    const offer = await Offer.findById(offerId);
    // console.log("Offer found:", offer);

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
    const id = req.params.id;
    const userId = req.user.id;
    const offerId = new mongoose.Types.ObjectId(id);

    let {
      title,
      description,
      expiryDate,
      discountPercentage,
      maxDiscountCap,
      minBillAmount,
      inclusion,
      exclusion,
    } = req.body;

    inclusion = safeJsonParse(inclusion);
    exclusion = safeJsonParse(exclusion);

    const user = await User.findById(userId);
    if (user?.deleted_at) {
      return validationErrorResponse(res, "Your account is blocked", 403);
    }

    const record = await Offer.findById(offerId);
    if (!record) {
      return errorResponse(res, "Offer not found", 404);
    }

    let isExpired;
    if (expiryDate) {
      isExpired = new Date(expiryDate) < new Date();
    }

    // 🔹 Fetch existing offer (flat / percentage)
    const existingOffer =
      record.type === "flat"
        ? await FlatOffer.findById(record.flat)
        : await PercentageOffer.findById(record.percentage);

    if (!existingOffer) {
      return errorResponse(res, "Offer data not found", 404);
    }

    // 🔹 Prepare update payload
    const updateData = {
      title,
      description,
      expiryDate,
      minBillAmount,
      discountPercentage:
        discountPercentage !== undefined
          ? discountPercentage
          : existingOffer.discountPercentage,
      maxDiscountCap:
        maxDiscountCap !== undefined
          ? maxDiscountCap
          : existingOffer.maxDiscountCap,
    };

    // 🔹 Recalculate amount safely
    updateData.amount = calculateOfferAmount({
      type: record.type,
      discountPercentage: updateData.discountPercentage,
      maxDiscountCap: updateData.maxDiscountCap,
    });

    if (typeof isExpired === "boolean") {
      updateData.isExpired = isExpired;
    }

    if (req.file?.filename) {
      updateData.offer_image = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    }

    // 🔹 Update correct offer collection
    let updatedOffer;
    if (record.type === "flat") {
      updatedOffer = await FlatOffer.findByIdAndUpdate(
        record.flat,
        updateData,
        { new: true }
      );
    } else {
      updatedOffer = await PercentageOffer.findByIdAndUpdate(
        record.percentage,
        updateData,
        { new: true }
      );
    }

    // 🔹 Update inclusion & exclusion on main Offer doc
    const offerUpdate = {};
    if (inclusion !== undefined) offerUpdate.inclusion = inclusion;
    if (exclusion !== undefined) offerUpdate.exclusion = exclusion;

    if (Object.keys(offerUpdate).length) {
      await Offer.findByIdAndUpdate(record._id, offerUpdate);
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
      return validationErrorResponse(res, "category not found", 200);
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
      return validationErrorResponse(res, "Please provide id", 200);
    }

    let { start, end } = req.query;
    const now = new Date();

    let startDate, endDate;

    // Treat empty strings as undefined
    start = start?.trim() || null;
    end = end?.trim() || null;

    if (start && end) {
      startDate = new Date(start);
      endDate = new Date(end);
    } else {
      // Default: last 7 days
      endDate = now;
      startDate = new Date();
      startDate.setDate(now.getDate() - 6);
    }

    const Vendors = await Vendor.findOne({ user: userId });

    // ✅ Aggregation for overall stats
    const offerBuyStats = await OfferBuy.aggregate([
      { $match: { vendor: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalSales: {
            $sum: {
              $cond: [
                { $eq: ["$vendor_bill_status", true] },
                "$final_amount",
                0
              ]
            }
          },
          // users: { $addToSet: "$user" },
          redeemedCount: {
            $sum: { $cond: [{ $eq: ["$vendor_bill_status", true] }, 1, 0] },
          },
          totalVouchers: {
            $sum: 1,
          },
        },
      },
    ]);

    const statsData = offerBuyStats[0] || {
      totalSales: 0,
      redeemedCount: 0,
      totalVouchers: 0,
    };

    const activeOffersCount = await Offer.countDocuments({
      vendor: userId,
      status: "active",
    });

    const dailySales = await OfferBuy.aggregate([
      {
        $match: {
          vendor: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startDate, $lte: endDate },
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
      { $sort: { _id: 1 } },
    ]);

    // console.log("dailySales", dailySales);

    const salesByDate = [];
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dayKey = d.toISOString().split("T")[0];
      const match = dailySales.find((x) => x._id === dayKey);

      salesByDate.push({
        date: dayKey,
        offers_sold: match ? match.offers_sold : 0,
      });
    }

    // ✅ Last 5 Purchases
    const lastFivePurchases = await OfferBuy.find({ vendor: userId, vendor_bill_status: true })
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
        totalVouchers: statsData.totalVouchers || 0,
      },
      last_7_days_sales: salesByDate,
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
    const allPurchases = await OfferBuy.find({ vendor: vendorId, status: {$ne : "upgraded"} })
      .populate("user", "name email phone")
      .populate({
        path: "offer",
        populate: [{ path: "flat" }, { path: "percentage" }],
      })
      .populate("payment_id")
      .sort({ createdAt: -1 });

    if (!allPurchases || allPurchases.length === 0) {
      return validationErrorResponse(res, "No purchases found for this vendor", 200);
    }

    // console.log("allPurchases", allPurchases);

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

      offerStats[offerId].total_revenue += purchase.vendor_bill_status ? (purchase.final_amount || 0) : 0;
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

    if (!vendorId || !offerId) {
      return validationErrorResponse(res, "Vendor ID and Offer ID are required.", 400);
    }

    const query = {
      vendor: new mongoose.Types.ObjectId(vendorId),
      offer: new mongoose.Types.ObjectId(offerId),
    };

    const skip = (page - 1) * limit;

    const allPurchases = await OfferBuy.find(query)
      .populate("user", "name email phone")
      .populate({
        path: "offer",
        populate: [
          { path: "flat", select: "title discount" },
          { path: "percentage", select: "title discount" },
        ],
      })
      .populate("payment_id")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total_records = await OfferBuy.countDocuments(query);
    const total_pages = Math.ceil(total_records / limit);

    if (!allPurchases.length) {
      return validationErrorResponse(res, "No purchase found", 200);
    }

    /** 🔹 Fetch all vendor-related purchases (for linking) */
    const allRelated = await OfferBuy.find({
      vendor: vendorId,
    })
      .populate("payment_id")
      .populate({
        path: "offer",
        populate: [
          { path: "flat", select: "title discount" },
          { path: "percentage", select: "title discount" },
        ],
      })
      .lean();

    /** 🔹 Build lookup maps */
    const byIdMap = new Map();
    const upgradedToMap = new Map(); // upgraded_from → OfferBuy

    allRelated.forEach((doc) => {
      byIdMap.set(doc._id.toString(), doc);
      if (doc.upgraded_from) {
        upgradedToMap.set(doc.upgraded_from.toString(), doc);
      }
    });

    /** 🔹 Attach upgrade data */
    const enrichedPurchases = allPurchases.map((purchase) => {
      let updatedPurchase = { ...purchase };

      /** CASE 1: upgraded_from exists → build full history */
      if (purchase.upgraded_from) {
        const history = [];
        let current = byIdMap.get(purchase.upgraded_from.toString());

        while (current) {
          history.push(current);
          current = current.upgraded_from
            ? byIdMap.get(current.upgraded_from.toString())
            : null;
        }

        history.reverse(); // root → latest previous
        updatedPurchase.upgraded_from = history;
      }

      /** CASE 2: status === upgraded → find upgrade_to */
      if (purchase.status === "upgraded") {
        const upgradeTo = upgradedToMap.get(purchase._id.toString()) || null;
        updatedPurchase.upgrade_to = upgradeTo;
      }

      return updatedPurchase;
    });

    return successResponse(res, "Vendor amount updated successfully", 200, {
      purchased_customers: enrichedPurchases,
      total_records,
      current_page: Number(page),
      per_page: Number(limit),
      total_pages,
      nextPage: page < total_pages ? Number(page) + 1 : null,
      previousPage: page > 1 ? Number(page) - 1 : null,
    });
  } catch (error) {
    console.error("Error fetching purchased customers:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
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
    let { total_amount, vendor_bill_status } = req.body;

    if (!id) {
      return validationErrorResponse(res, "Missing offer ID", 400);
    }

    if (isNaN(total_amount)) {
      return validationErrorResponse(res, "Total amount must be a valid number", 400);
    }

    const user = await User.findById(req.user.id);

    if(user?.deleted_at){
      return validationErrorResponse(res, "Your account is blocked", 403);
    }

    // Fetch record + offer details (same as Function 2)
    const record = await OfferBuy.findById(id).populate({
      path: "offer",
      populate: [{ path: "flat" }, { path: "percentage" }]
    }).populate("vendor");

    if(req?.user?.id != record?.vendor?._id){
      return validationErrorResponse(res, "You are not authorized to update this record", 403);
    }

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

        final = total_amount - discount - record?.offer_paid_amount;
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
        final = total_amount - discount - record?.offer_paid_amount;
      }
      else {
        console.log("Invalid offer type");
      }
    }

    // ----------------------------------------------
    // ✔ Update the record (same as before)
    // ----------------------------------------------
    record.total_amount = total_amount;
    record.vendor_bill_status = vendor_bill_status;
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
      return validationErrorResponse(res, "Vendor not found", 200);
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