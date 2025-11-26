const Offer = require("../model/Offer");
const Payment = require("../model/Payment");
const User = require("../model/User");
const Vendor = require("../model/Vendor");
const OfferBuy = require("../model/OfferBuy.js");
const Categories = require("../model/categories.js");
const catchAsync = require("../utils/catchAsync");
const {
  errorResponse,
  successResponse,
  validationErrorResponse,
} = require("../utils/ErrorHandling");
const jwt = require("jsonwebtoken");
const mongoose = require('mongoose');
const deleteUploadedFiles = require("../utils/fileDeleter.js");

exports.Login = catchAsync(async (req, res) => {
  try {
    const { email, password, role } = req.body;
    console.log(req.body);
    if (!email || !password || !role) {
      return validationErrorResponse(
        res,
        "email , password and role all are required",
        401
      );
    }
    const user = await User.findOne({ email: email, password: password });
    if (!user) {
      return validationErrorResponse(res, "Invalid email or password", 401);
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET_KEY,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );
    return successResponse(res, "Admin Login successfully", 200, {
      user: user,
      token: token,
      role: user?.role,
    });

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

exports.UserGet = catchAsync(async (req, res) => {
  try {
    const { search = "" } = req.query;
    let query = { role: "customer" };
    if (search && search.trim() !== "") {
      const regex = { $regex: search.trim(), $options: "i" };
      query.$or = [{ name: regex }, { email: regex }];
    }
    const customers = await User.find(query);
    if (!customers || customers.length === 0) {
      return validationErrorResponse(res, "No Users found", 404);
    }
    const customerIds = customers.map((c) => c._id);
    const purchaseCounts = await OfferBuy.aggregate([
      { $match: { user: { $in: customerIds } } },
      { $group: { _id: "$user", total: { $sum: 1 } } }
    ]);
    const countMap = {};
    purchaseCounts.forEach((p) => {
      countMap[p._id.toString()] = p.total;
    });
    const finalData = customers.map((cust) => ({
      ...cust.toObject(),
      purchases_count: countMap[cust._id.toString()] || 0
    }));
    return successResponse(res, "Customers fetched successfully", 200, finalData);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.CategoryGet = catchAsync(async (req, res) => {
  try {
    const data = await Categories.find();

    if (!data || data.length === 0) {
      return validationErrorResponse(res, "No sales users found", 404);
    }

    return successResponse(
      res,
      "Categories fetched successfully",
      200,
      data
    );
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.SalesGet = catchAsync(async (req, res) => {
  try {
    const { search = "" } = req.query;

    let query = { role: "sales" };

    if (search.trim() !== "") {
      const regex = { $regex: search.trim(), $options: "i" };
      query.$or = [{ name: regex }, { email: regex }];
    }

    // 1. Get all sales users
    const salesUsers = await User.find(query).lean();

    if (!salesUsers || salesUsers.length === 0) {
      return validationErrorResponse(res, "No sales users found", 404);
    }

    // 2. Get all vendors with assign_staff
    const vendors = await Vendor.find(
      { assign_staff: { $ne: null } },
      { assign_staff: 1 }
    ).lean();

    // 3. Build a map: staffId → count
    const staffCountMap = {};

    vendors.forEach((vendor) => {
      const staffId = String(vendor.assign_staff);
      staffCountMap[staffId] = (staffCountMap[staffId] || 0) + 1;
    });

    // 4. Attach count to each sales user
    const finalData = salesUsers.map((user) => ({
      ...user,
      assigned_vendors: staffCountMap[String(user._id)] || 0,
    }));

    return successResponse(
      res,
      "Sales users fetched successfully",
      200,
      finalData
    );
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.SalesList = catchAsync(async (req, res) => {
  try {
    const query = {
      role: "sales",
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }],
    };

    const record = await User.find(query)
      .sort({ createdAt: -1 });

    return successResponse(res, "Sales team fetched successfully", 200, record);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.PaymentGet = catchAsync(async (req, res) => {
  try {
    const record = await Payment.find({});
    if (!record || record.length === 0) {
      return validationErrorResponse(res, "No Users found", 404);
    }
    return successResponse(res, "payment fetched successfully", 200, record);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.AdminVendorGet = catchAsync(async (req, res) => {
  try {
    const { search = "", status = "", category = "" } = req.query;

    let query = {};

    if (search && search.trim() !== "") {
      const regex = { $regex: search.trim(), $options: "i" };

      const matchedUsers = await User.find({
        $or: [{ name: regex }, { email: regex }],
      }).select("_id");

      const userIds = matchedUsers.map((u) => u._id);
      query.$or = [{ business_name: regex }, { user: { $in: userIds } }];
    }

    if (category && category.trim() !== "") {
      query.category = category;
    }

    if (status === "verify") {
      query.Verify_status = "verify";
    } else if (status === "unverify") {
      query.Verify_status = "unverify";
    }

    const vendor = await Vendor.find(query)
      .populate("user")
      .populate("category")
      .populate("subcategory")
      .populate("assign_staff");

    return res.json({
      message: "Vendor Get!!",
      vendor,
      status: 200,
    });
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.VendorRegister = catchAsync(async (req, res) => {
  try {
    // console.log("req.body", req.body);
    const adminid = req.user.id;

    let {
      business_name,
      city,
      categroy,   // original spelling maintained
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
      landmark,
    } = req.body;

    // =============== VALIDATION ===============
    if (!name || !phone)
      return errorResponse(res, "Name and phone are required", 400);

    if (!business_name || !city || !categroy || !subcategory || !state || !pincode || !area) {
      return errorResponse(res, "All vendor details are required", 400);
    }
    // console.log("Hello");

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return errorResponse(res, "Phone number already exists", 400);
    }

    // =============== CREATE USER ===============
    const user = new User({
      name,
      phone,
      role: "vendor",
      email,
    });

    const savedUser = await user.save();
    if (!savedUser) return errorResponse(res, "Failed to create user", 500);

    // =============== FILE HANDLING ===============
    const uploadedFiles = req.files || {};

    const makeFileUrl = (field) => {
      if (!uploadedFiles[field] || uploadedFiles[field].length === 0) return null;
      const file = uploadedFiles[field][0];
      return `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
    };

    // =============== VALID opening_hours TYPE ===============
    if (opening_hours) {
      opening_hours = JSON.parse(opening_hours);
    }
    if (opening_hours && typeof opening_hours !== "object") {
      return errorResponse(res, "Opening hours must be a valid object", 400);
    }

    // =============== CONVERT CATEGORY IDs SAFELY ===============
    const safeObjectId = (val) => {
      if (!val) return null;
      const trimmed = val.trim();
      return mongoose.isValidObjectId(trimmed)
        ? new mongoose.Types.ObjectId(trimmed)
        : null;
    };

    // =============== CREATE VENDOR ===============
    const vendor = new Vendor({
      user: savedUser._id,
      business_name,
      city,
      category: safeObjectId(categroy),
      subcategory: safeObjectId(subcategory),
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
      landmark,
      added_by: adminid,

      // FILES ↓↓↓ ONLY THESE
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

    return successResponse(res, "Vendor created successfully", 201, savedVendor);

  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.vendorUpdate = catchAsync(async (req, res) => {
  try {
    const adminid = req.user.id;
    const id = req.params.id;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return validationErrorResponse(res, "Vendor not found", 404);
    }

    const uploadedFiles = req.files || {};
    const makeFileUrl = (field) => {
      if (!uploadedFiles[field] || uploadedFiles[field].length === 0) return vendor[field];
      const file = uploadedFiles[field][0];
      return `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
    };

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
      landmark,
    } = req.body;

    // Parse opening hours
    if (opening_hours) {
      try {
        opening_hours = JSON.parse(opening_hours);
      } catch {}
    }

    // Convert Category IDs safely
    const safeObjectId = (val) => {
      if (!val) return undefined;
      const trimmed = val.trim();
      return mongoose.isValidObjectId(trimmed)
        ? new mongoose.Types.ObjectId(trimmed)
        : undefined;
    };

    // === Update User only if provided ===
    if (phone || name || email) {
      await User.findByIdAndUpdate(
        vendor.user,
        { name, phone, email },
        { new: true }
      );
    }

    // === Prepare update object only with provided fields ===
    const updateFields = {
      business_name,
      city,
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
      landmark,
      added_by: adminid,

      // FILES HANDLED SAFELY
      aadhaar_front: makeFileUrl("aadhaar_front"),
      aadhaar_back: makeFileUrl("aadhaar_back"),
      pan_card_image: makeFileUrl("pan_card_image"),
      gst_certificate: makeFileUrl("gst_certificate"),
      business_logo: makeFileUrl("business_logo"),
    };

    // Handle category separately
    const convertedCategory = safeObjectId(category);
    if (convertedCategory !== undefined)
      updateFields.category = convertedCategory;

    const convertedSubCat = safeObjectId(subcategory);
    if (convertedSubCat !== undefined)
      updateFields.subcategory = convertedSubCat;

    // Remove undefined so it doesn’t overwrite existing DB fields
    Object.keys(updateFields).forEach(
      (key) => updateFields[key] === undefined && delete updateFields[key]
    );

    const vendordata = await Vendor.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    ).populate("user");

    return successResponse(res, "Vendor updated successfully", 200, vendordata);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.adminGet = catchAsync(async (req, res) => {
  try {
    const adminId = req.user?.id || null;
    const admins = await User.findOne({ role: "admin" }).select("-password");

    if (!admins || admins.length === 0) {
      return validationErrorResponse(res, "No admin users found", 404);
    }

    return successResponse(
      res,
      "Admin users fetched successfully",
      200,
      admins
    );
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.VendorGetId = catchAsync(async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      return errorResponse(res, "Vendor ID is required", 400);
    }

    // Fetch vendor details
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

    const vendorBillsFalse = await OfferBuy.countDocuments({
      vendor: vendorId,
      vendor_bill_status: false
    });

    const uniqueUsers = await OfferBuy.distinct("user", { vendor: vendorId });
    const totalUniqueUsers = uniqueUsers.length;

    const offerList = await Offer.find({ vendor: vendorId })
      .populate("flat")
      .populate("percentage");

    return successResponse(res, "Vendor details fetched successfully", 200, {
      record,
      offer: offerList,
      stats: {
        total_offers: totalOffers,
        vendor_bill_true: vendorBillsTrue,
        vendor_bill_false: vendorBillsFalse,
        unique_customers: totalUniqueUsers
      }
    });

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.AdminDashboard = catchAsync(async (req, res) => {
  try {
    const total_sales = await User.countDocuments({
      role: "sales",
      deleted_at: null,
    });

    const vendors = await Vendor.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({
        path: "user",
        match: { deleted_at: null },
        select: "name email phone role deleted_at",
      });

    const active_offers = await Offer.countDocuments({
      status: "active",
    });

    const total_offer_buys = await OfferBuy.countDocuments();
    const total_vendors = await Vendor.aggregate([
    {
      $match: {
        status: "active",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $match: {
        "user.deleted_at": null,
      },
    },
    {
      $count: "total_vendors",
    },
  ]);

  const count = total_vendors.length ? total_vendors[0].total_vendors : 0;

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6);

    const dailySales = await OfferBuy.aggregate([
      {
        $match: {
          //   vendor: new mongoose.Types.ObjectId(userId),
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
      { $sort: { _id: 1 } },
    ]);

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

    return successResponse(
      res,
      "Admin dashboard data fetched successfully",
      200,
      {
        vendors,
        last7Days,
        stats: {
          total_vendors: total_vendors,
          total_sales,
          active_offers,
          total_offer_buys,
        },
      }
    );
  } catch (error) {
    console.error("AdminDashboard error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.AssignStaff = catchAsync(async (req, res) => {
  try {
    const { vendor_id, assign_staff } = req.body;

    // Validate input
    if (!vendor_id || !assign_staff) {
      return validationErrorResponse(
        res,
        "vendor_id and assign_staff are required",
        400
      );
    }

    const vendordata = await Vendor.findByIdAndUpdate(
      vendor_id,
      { assign_staff: assign_staff },
      { new: true }
    );

    if (!vendordata) {
      return validationErrorResponse(res, "Vendor not found", 404);
    }
    return successResponse(res, "Assign Staff Successfully", 200, vendordata);
  } catch (error) {
    console.error("Error assigning staff:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.AddSalesPersons = catchAsync(async (req, res) => {
  try {
    // console.log("req.body", req.body);
    const { phone, otp, role, name, email } = req.body;
    // Validate required fields
    if (!phone || !otp || !name || !email) {
      return validationErrorResponse(
        res,
        "Phone number, OTP, Name, and Email are required.",
        401
      );
    }
    // OTP validation
    if (otp !== "111111") {
      return validationErrorResponse(
        res,
        "Invalid or expired OTP. Please try again.",
        400
      );
    }
    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return errorResponse(
        res,
        "A Sales Person with this phone number already exists.",
        200,
        { role: role }
      );
    }
    if (!req.file) {
      return errorResponse(res, "Image is required", 400);
    }
    let avatar;
    if (req.file && req.file.filename) {
      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
      avatar = fileUrl;
    }

    // Create new Sales Person
    const newUser = new User({
      name,
      email,
      phone,
      role,
      avatar,
    });

    const record = await newUser.save();

    // Success response
    return successResponse(res, "Sales Person registered successfully.", 200, {
      record,
    });

    // Optional: Verify OTP with Twilio (currently unreachable)
    // const verificationCheck = await client.verify.v2
    //     .services(process.env.TWILIO_VERIFY_SID)
    //     .verificationChecks.create({ to: phone, code: otp });
    // if (verificationCheck.status === "approved") {
    //     return successResponse(res, "OTP verified successfully", 200);
    // } else {
    //     return validationErrorResponse(res, "Invalid or expired OTP", 400);
    // }
  } catch (error) {
    console.error("AddSalesPersons error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.EditSalesPerson = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, status } = req.body;

    const user = await User.findById(id);
    // if (!user || user.deleted_at) {
    //   return validationErrorResponse(res, "Sales Person not found.", 404);
    // }

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (status) user.status = status;

    if (req.file && req.file.filename) {
      if (user.avatar) {
        try {
          await deleteUploadedFiles([user.avatar]); // pass as array of URLs
        } catch (err) {
          console.log("Failed to delete old avatar:", err.message);
        }
      }

      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
      user.avatar = fileUrl;
    }

    const updatedUser = await user.save();

    return successResponse(
      res,
      "Sales Person updated successfully.",
      200,
      updatedUser
    );
  } catch (error) {
    console.error("EditSalesPerson error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.DeleteUser = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return validationErrorResponse(res, "Person not found.", 404);
    }
    // Toggle delete/undelete
    if (user.deleted_at) {
      user.deleted_at = null; // undelete (restore)
      await user.save();
      return successResponse(res, "Person blocked successfully.", 200);
    } else {
      user.deleted_at = new Date(); // soft delete
      await user.save();
      return successResponse(res, "Person unblocked successfully.", 200);
    }
  } catch (error) {
    console.error("DeleteSalesPerson error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.EditAdmin = catchAsync(async (req, res) => {
  try {
    console.log(req.user);
    const id = req.user.id;
    // console.log("id", id);
    const { name, email, phone, role, status } = req.body;

    const user = await User.findById(id);

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    // if (avatar) user.avatar = avatar;
    if (role) user.role = role;
    if (status) user.status = status;

    if (req.file && req.file.filename) {
      if (user.avatar) {
        try {
          await deleteUploadedFiles([user.avatar]); // pass as array of URLs
        } catch (err) {
          console.log("Failed to delete old avatar:", err.message);
        }
      }

      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
      user.avatar = fileUrl;
    }

    const updatedUser = await user.save();

    return successResponse(
      res,
      "Admin  Person updated successfully.",
      200,
      updatedUser
    );
  } catch (error) {
    console.error("EditAdmin Person error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.resetpassword = catchAsync(async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: "Password has been reset successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Error resetting password", error });
  }
});

exports.SalesAdminGetId = catchAsync(async (req, res) => {
  try {
    const salesId = req.params.id;

    const sales = await User.findOne({ _id: salesId, role: "sales" });

    if (!sales) {
      return errorResponse(res, "Sales user not found", 404);
    }

    const vendors = await Vendor.find({ assign_staff: salesId });

    if (!vendors || vendors.length === 0) {
      return errorResponse(res, "No vendors assigned to this sales person", 404);
    }

    const vendorIds = vendors.map(v => v.user);

    const offerStatusCount = await OfferBuy.aggregate([
      { $match: { vendor: { $in: vendorIds } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const statusList = ["active", "expired", "redeemed", "under-dispute"];

    const total_stats = {};
    statusList.forEach(st => {
      const found = offerStatusCount.find(x => x._id === st);
      total_stats[st] = found ? found.count : 0;
    });

    const vendor_status_list = [];

    for (let vendor of vendors) {
      const stats = await OfferBuy.aggregate([
        { $match: { vendor: vendor.user } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]);

      const formattedVendorStatus = {};
      statusList.forEach(st => {
        const f = stats.find(x => x._id === st);
        formattedVendorStatus[st] = f ? f.count : 0;
      });

      vendor_status_list.push({
        vendors: vendor,
        // vendors: vendors,
        status_count: formattedVendorStatus
      });
    }

    return successResponse(res, "Sales & vendor status details", 200, {
      sales,
      // vendors,
      total_offer_stats: total_stats,
      vendors: vendor_status_list,
    });

  } catch (error) {
    console.log(error);
    return errorResponse(res, "Failed to fetch vendor details", 500);
  }
});

exports.BroughtOffers = catchAsync(async (req, res) => {
  try {
    const id = req?.user?.id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const total_records = await OfferBuy.countDocuments({ user: id });
    const total_pages = Math.ceil(total_records / limit);
    const allPurchases = await OfferBuy.find()
      .populate("user")
      .populate("offer")
      .populate("vendor")
      .populate("payment_id")
      .populate({
        path: "offer",
        populate: [{ path: "flat" }, { path: "percentage" }],
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    return successResponse(res, "Brought offers fetched successfully", 200, {
      purchased: allPurchases,
      total_records,
      current_page: page,
      per_page: limit,
      total_pages,
      nextPage: page < total_pages ? page + 1 : null,
      previousPage: page > 1 ? page - 1 : null,
    });
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});