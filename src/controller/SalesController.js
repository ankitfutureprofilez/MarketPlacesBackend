const User = require("../model/User");
const Offer = require("../model/Offer");
const OfferBuy = require("../model/OfferBuy");
const Vendor = require("../model/Vendor");
const catchAsync = require("../utils/catchAsync");
const { errorResponse, successResponse, validationErrorResponse } = require("../utils/ErrorHandling");
const { default: mongoose } = require("mongoose");


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
  let savedUser;

  try {
    const StaffID = req.user.id;

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
      email,
    } = req.body;

    // 🔹 Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return errorResponse(res, "Phone number already exists", 400);
    }

    // 🔹 Normalize weekly_off_day (same as vendor)
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
        .map((d) => new Date(d))
        .filter((d) => !isNaN(d.getTime()));
    }

    // 🔹 Uploaded files
    const uploadedFiles = req.files || {};

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
      return errorResponse(
        res,
        "At least one address proof document is required",
        400
      );
    }

    if (!hasBusinessProof) {
      return errorResponse(
        res,
        "At least one business proof document is required",
        400
      );
    }

    const makeFileUrl = (fieldName) => {
      if (!uploadedFiles[fieldName] || uploadedFiles[fieldName].length === 0)
        return null;
      const file = uploadedFiles[fieldName][0];
      return `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
    };

    // 🔹 Create user
    const user = new User({
      name,
      phone,
      role: "vendor",
      email,
    });

    savedUser = await user.save();
    if (!savedUser) {
      return errorResponse(res, "Failed to create user", 500);
    }

    // 🔹 Safe ObjectId cast
    const safeObjectId = (val) => {
      if (!val) return null;
      const trimmed = val.trim();
      return mongoose.isValidObjectId(trimmed)
        ? new mongoose.Types.ObjectId(trimmed)
        : null;
    };

    // 🔹 Create vendor
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
      // Sales-specific
      assign_staff: StaffID,
      added_by: StaffID,
    });

    const savedVendor = await vendor.save();
    if (!savedVendor) {
      return errorResponse(res, "Failed to create vendor", 500);
    }

    return successResponse(res, "Vendor created successfully", 201, {
      user: savedVendor,
      role: savedUser.role,
    });
  } catch (error) {
    console.error("Sales vendor registration failed:", error);

    if (savedUser && savedUser._id) {
      await User.findByIdAndDelete(savedUser._id);
    }
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
        // console.log("req.user", req.user);
        const sales = req.user.id;

        let { page = 1, limit = 25 } = req.query;
        page = Number(page);
        limit = Number(limit);

        const skip = (page - 1) * limit;

        // Count all vendors for this staff
        const total = await Vendor.countDocuments({ assign_staff: sales });

        const vendors = await Vendor.find({ assign_staff: sales })
            .populate("user")
            .populate("category")
            .populate("subcategory")
            .populate("assign_staff")
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        return successResponse(res, "Vendors fetched successfully", 200, {
            total,
            currentPage: page,               
            perPage: limit,
            totalPages: Math.ceil(total / limit),
            data: vendors
        });

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.Dashboard = catchAsync(async (req, res) => {
  try {
    const sales = req.user.id;

    const totalVendors = await Vendor.countDocuments({ 
      assign_staff: sales 
    });

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const totalVendorsThisMonth = await Vendor.countDocuments({ 
      assign_staff: sales,
      createdAt: { $gte: startOfMonth }
    });

    const pendingVerification = await Vendor.countDocuments({
      assign_staff: sales,
      Verify_status: "pending"
    });

    const vendors = await Vendor.find(
      { assign_staff: sales },
      { user: 1 } 
    );
    const vendorUsers = vendors.map(v => v.user).filter(Boolean);
    let totalSales = 0;
    if (vendorUsers.length > 0) {
      const revenueData = await OfferBuy.aggregate([
        {
          $match: {
            vendor: { $in: vendorUsers }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$final_amount" }
          }
        }
      ]);
      totalSales = revenueData[0]?.totalRevenue || 0;
    }

    const recentVendors = await Vendor.find({assign_staff: sales})
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("user")
    .select("business_name createdAt city area Verify_status user Verify_status");

    return successResponse(res, "Dashboard counts fetched successfully", 200, {
      stats:{
        totalVendors,
        totalVendorsThisMonth,
        pendingVerification,
        totalSales
      },
      vendors: recentVendors,
    });

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

// exports.SalesPersonStatus = catchAsync(async (req, res) => {
//     try {
//         console.log(req.params)
//         const offerId = req.params.id;
//         const status = req.params.status;
//         const record = await User.findByIdAndUpdate(
//             offerId,
//             { status },
//             { new: true }
//         );
//         if (!record) {
//             return validationErrorResponse(res, "Offer not found", 404);
//         }
//         return successResponse(res, "Offer status updated successfully", 201, record);
//     } catch (error) {
//         return errorResponse(res, error.message || "Internal Server Error", 500);
//     }
// });

// Sales phone number
exports.SalesphoneUpdate = catchAsync(async (req, res) => {
  try {
    const vendorId = req.user?.id || req.params.id;
    if (!vendorId) {
      return validationErrorResponse(res, "Sales ID missing", 400);
    }
    const { phone, otp } = req.body;
    if (!otp) {
      return validationErrorResponse(res, "Phone number is required", 400);
    }
    if (otp !== "123456") {
      return validationErrorResponse(res, "Invalid OTP", 400);
    }
    const vendordata = await User.findByIdAndUpdate(
      vendorId,
      { phone },
      { new: true }
    );
    return successResponse(res, "Sales updated successfully", 200, vendordata);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

// Sales Update Profile
exports.EditSalesPerson = catchAsync(async (req, res) => {
  try {
    const id = req.user.id;
    const { name, email   } = req.body;
    // console.log("req.body" ,req.body)
    const user = await User.findById(id);
    if (!user || user.deleted_at) {
      return validationErrorResponse(res, "Sales not found.", 404);
    }
    if (name) user.name = name;
    if (email) user.email = email;
    if (req.file && req.file.filename) {
      if (user.avatar) {
        try {
          await deleteUploadedFiles([user.avatar]); // pass as array of URLs
        } catch (err) {
          console.log("Failed to delete old avatar:", err.message);
        }
      }
      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${
        req.file.filename
      }`;
      user.avatar = fileUrl;
    }

    const updatedUser = await user.save();

    return successResponse(
      res,
      "Sales updated successfully.",
      200,
      updatedUser
    );
  } catch (error) {
    console.error("Sales update error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

//Sales OTP Verify
exports.OTPVerify = catchAsync(async (req, res) => {
  try {
    const { otp } = req.body;
    if ( !otp ) {
      return validationErrorResponse(
        res,
        " OTP is required",
        400
      );
    }
    if (otp !== "123456") {
        return validationErrorResponse(res, "Invalid or expired OTP", 400);
    }
       return successResponse(res, "OTP verified", 200 );

    // Verify OTP with Twilio
    // const verificationCheck = await client.verify.v2
    //   .services(process.env.TWILIO_VERIFY_SID)
    //   .verificationChecks.create({ to: phone, code: otp });
    // if (verificationCheck.status === "approved") {
    //   return successResponse(res, "OTP verified successfully", 200);
    // } else {
    //   return validationErrorResponse(res, "Invalid or expired OTP", 400);
    // }
  } catch (error) {
    console.error("VerifyOtp error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

//Vendor Update Api
exports.vendorUpdate = catchAsync(async (req, res) => {
  try {
    const vendorUserId = req.params.id;
    const salesId = req.user?.id;

    if (!vendorUserId) {
      return validationErrorResponse(res, "Vendor ID missing", 400);
    }

    // -----------------------------
    // 1) Uploaded files
    // -----------------------------
    const uploadedFiles = req.files || {};

    const makeFileUrl = (fieldName) => {
      if (!uploadedFiles[fieldName] || uploadedFiles[fieldName].length === 0)
        return undefined; // 👈 do not overwrite existing value

      const file = uploadedFiles[fieldName][0];
      return `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
    };

    // -----------------------------
    // 2) Parse & normalize body
    // -----------------------------
    let {
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
      avatar,
    } = req.body;

    // Normalize weekly_off_day (same as vendor register)
    if (weekly_off_day) {
      if (typeof weekly_off_day === "string") {
        try {
          weekly_off_day = JSON.parse(weekly_off_day);
        } catch {
          return validationErrorResponse(
            res,
            "Invalid weekly_off_day format",
            400
          );
        }
      }

      if (!Array.isArray(weekly_off_day)) {
        return validationErrorResponse(
          res,
          "weekly_off_day must be an array",
          400
        );
      }

      weekly_off_day = weekly_off_day
        .map((d) => new Date(d))
        .filter((d) => !isNaN(d.getTime()));
    }

    // -----------------------------
    // 3) Safe ObjectId casting
    // -----------------------------
    const safeObjectId = (val) => {
      if (!val) return undefined;
      const trimmed = val.trim();
      return mongoose.isValidObjectId(trimmed)
        ? new mongoose.Types.ObjectId(trimmed)
        : undefined;
    };

    // -----------------------------
    // 4) Update User (basic info)
    // -----------------------------
    await User.findByIdAndUpdate(
      vendorUserId,
      { name, email, avatar },
      { new: true }
    );

    // -----------------------------
    // 5) Vendor update payload
    // -----------------------------
    const vendorUpdateData = {
      business_name,
      city,
      state,
      category: safeObjectId(category),
      subcategory: safeObjectId(subcategory),
      pincode,
      area,
      phone,
      lat,
      long,
      address,
      gst_number,
      opening_hours,
      weekly_off_day,
      business_register,
      email,

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

      // Sales metadata
      added_by: salesId,
      assign_staff: salesId,
    };

    // 🔹 Remove undefined fields (no overwrite)
    Object.keys(vendorUpdateData).forEach((key) => {
      if (vendorUpdateData[key] === undefined) {
        delete vendorUpdateData[key];
      }
    });

    // -----------------------------
    // 6) Update Vendor
    // -----------------------------
    const vendordata = await Vendor.findOneAndUpdate(
      { user: vendorUserId },
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

//vendore Details : 
exports.VendorSalesGetId = catchAsync(async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      return errorResponse(res, "Vendor ID is required", 400);
    }
    // Copied api from admin panel
    let records = await Vendor.findById(id)
      .populate("user")
      .populate("added_by")
      .populate("category")
      .populate("subcategory");

    if (!records) {
      return validationErrorResponse(res, "Vendor not found", 404);
    }
    // console.log("records", records);

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
      business_logo: records?.business_logo ?? null,

      aadhaar_front: records?.aadhaar_front ?? null,
      aadhaar_back: records?.aadhaar_back ?? null,
      pan_card_image: records?.pan_card_image ?? null,
      gst_certificate: records?.gst_certificate ?? null,
      shop_license: records?.shop_license ?? null,
      driving_license: records?.driving_license ?? null,
      passport: records?.passport ?? null,
      udhyam: records?.udhyam ?? null,
      trade_license: records?.trade_license ?? null,
      // Verification status
      aadhaar_verify: records?.aadhaar_verify ?? "pending",
      pan_card_verify: records?.pan_card_verify ?? "pending",
      gst_certificate_verify: records?.gst_certificate_verify ?? "pending",
      shop_license_verify: records?.shop_license_verify ?? "pending",
      driving_license_verify: records?.driving_license_verify ?? "pending",
      passport_verify: records?.passport_verify ?? "pending",
      udhyam_verify: records?.udhyam_verify ?? "pending",
      trade_license_verify: records?.trade_license_verify ?? "pending",
      // Rejection reasons
      aadhaar_reason: records?.aadhaar_reason ?? null,
      pan_card_reason: records?.pan_card_reason ?? null,
      gst_certificate_reason: records?.gst_certificate_reason ?? null,
      shop_license_reason: records?.shop_license_reason ?? null,
      driving_license_reason: records?.driving_license_reason ?? null,
      passport_reason: records?.passport_reason ?? null,
      udhyam_reason: records?.udhyam_reason ?? null,
      trade_license_reason: record?.trade_license_reason ?? null,
    };

    const businessObj = {
      business_name: records.business_name,
      category: records.category,
      subcategory: records.subcategory,
      business_register: records.business_register,
      pan_card: records.pan_card,
      gst_number: records.gst_number,
      address: records.address,
      city: records.city,
      area: records.area,
      pincode: records.pincode,
      lat: records.lat,
      long: records.long,
      landmark: records.landmark,
      business_image: records.business_image,
      state: records.state,
      email: records?.vendor?.email,
      country: records?.country
    };

    const timingObj = {
      opening_hours: records.opening_hours,
      weekly_off_day: records.weekly_off_day,
    };

    // const vendorObj = {
    //   vendor: records.user,
    //   sales: records.added_by,
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

    // Sales api
    const record = await Vendor.findById(id)
      .populate("user")
      .populate("category")
      .populate("subcategory");

    if (!record) {
      return validationErrorResponse(res, "Vendor not found", 404);
    }

    const vendorId = record.user._id;

    const totalOffers = await Offer.countDocuments({ vendor: vendorId, status: "active" });


    const vendorBillsTrue = await OfferBuy.countDocuments({
      vendor: vendorId,
      vendor_bill_status: true
    });

    const totalFinalAmount = await OfferBuy.aggregate([
      {
        $match: {
          vendor: vendorId,
          vendor_bill_status: true
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$final_amount" }
        }
      }
    ]);
    const sumFinalAmount = totalFinalAmount.length > 0 ? totalFinalAmount[0].total : 0;

    const uniqueUsers = await OfferBuy.distinct("user", { vendor: vendorId });
    const totalUniqueUsers = uniqueUsers.length;

    const offerList = await Offer.find({ vendor: vendorId })
      .populate("flat")
      .populate("percentage");

    const stats = {
        total_offers: totalOffers,
        redeemed: vendorBillsTrue,
        totalRevenue: sumFinalAmount,
        unique_customers: totalUniqueUsers
      }

    const transformed = {
      _id: records._id,
      uuid: records.uuid,
      document: documentObj,
      business_details: businessObj,
      timing: timingObj,
      vendor: records.user,
      sales: records.added_by,
      status: records.status,
      Verify_status: records.Verify_status,
      createdAt: records.createdAt,
      updatedAt: records.updatedAt,
      percentages,
      stats
    };

    return successResponse(res, "Vendor details fetched successfully", 200, transformed);

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.SalesPersonGet = catchAsync(async (req, res) => {
  try {
    const salesId = req.user?.id;
    if (!salesId) {
      return validationErrorResponse(res, "Sales ID is missing", 400);
    }
    const salesperson = await User.findById(salesId).select("-password");

    if (!salesperson) {
      return validationErrorResponse(res, "Salesperson not found", 404);
    }

    return successResponse(
      res,
      "Salesperson fetched successfully",
      200,
      salesperson
    );
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});
