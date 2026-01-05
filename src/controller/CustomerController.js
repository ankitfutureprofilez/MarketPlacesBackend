const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../model/User");
const Vendor = require("../model/Vendor");
const Offer = require("../model/Offer.js");
const OfferBuy = require("../model/OfferBuy.js");
const catchAsync = require("../utils/catchAsync");
const {
  successResponse,
  errorResponse,
  validationErrorResponse,
} = require("../utils/ErrorHandling.js");
const categories = require("../model/categories.js");
const Razorpay = require("razorpay");
const Payment = require("../model/Payment.js");
const deleteUploadedFiles = require("../utils/fileDeleter.js");

exports.CustomerRegister = catchAsync(async (req, res) => {
  try {
    const { name, phone, email } = req.body;

    if (!name || !phone) {
      return errorResponse(res, "Name and phone are required", 400);
    }

    const Users = await User.findOne({ phone: phone });
    if (Users) {
      return errorResponse(res, "Phone number already exists", 400);
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
      return errorResponse(res, "No customers found", 200);
    }
    return successResponse(
      res,
      "Customers retrieved successfully",
      200,
      customer
    );
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.VendorOfferGet = catchAsync(async (req, res) => {
  try {
    // Correct way to get :id from route
    const vendorid = req.params.id;
    console.log("userId:", vendorid);
    const user_id = req.user.id;
    console.log("user_id", user_id);
    const record = await Offer.find({ vendor: vendorid })
      .populate("flat")
      .populate("percentage");
    const updatedOffers = await Promise.all(
      record.map(async (offer) => {
        const existingBuy = await OfferBuy.findOne({
          offer: offer._id,
          user: user_id,
        });

        const purchase_status = existingBuy ? true : false;
        return { ...offer.toObject(), purchase_status };
      })
    );

    console.log("updatedOffers", updatedOffers);

    if (!record || record.length === 0) {
      return validationErrorResponse(res, "Offer not found", 200);
    }

    return successResponse(
      res,
      "Offer Get fetched successfully",
      200,
      updatedOffers
    );
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.GetOfferById = catchAsync(async (req, res) => {
  try {
    const userId = req.query?.user_id; // optional
    const offerId = req.params.id.trim();

    const record = await Offer.findById(offerId)
      .populate("vendor")
      .populate("flat")
      .populate("percentage");

    if (!record) {
      return validationErrorResponse(res, "Offer not found", 404);
    }

    // Conditionally add user filter only if userId exists
    const query = { offer: offerId };
    if (userId) {
      query.user = userId;
    }

    const existingBuy = await OfferBuy.findOne(query);

    const userOfferStatus = existingBuy ? true : false;

    const offerBuys = await OfferBuy.find({ offer: offerId })
      .populate("user")
      .populate("vendor")
      .populate("payment_id")
      .populate("offer");

    const totalBuys = offerBuys.length;
    const redeemCount = offerBuys.filter((b) => b.status === "redeemed").length;
    const pendingCount = offerBuys.filter((b) => b.status === "active").length;
    const expiredCount = offerBuys.filter((b) => b.status === "expired").length;

    return successResponse(res, "Offer details fetched successfully", 200, {
      record,
      purchase_status: userOfferStatus,
      stats: {
        total: totalBuys,
        redeemed: redeemCount,
        pending: pendingCount,
        expired: expiredCount,
      },
      offerBuys,
    });
  } catch (error) {
    console.error("Error fetching offer details:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

const getVendorsWithMaxOffer = async (vendors) => {
  return await Promise.all(
    vendors.map(async (vendor) => {
      const vendorId = new mongoose.Types.ObjectId(vendor.user._id);
      // console.log("vendor",vendorId);
      // Fetch all active offers for the vendor
      const offers = await Offer.find({ vendor: vendorId, status: "active" })
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
        maxOffer:
          maxDiscountValue > 0
            ? { amount: maxDiscountValue, type: maxOfferType }
            : null,
        activeOffersCount,
      };
    })
  );
};

exports.VendorGet = catchAsync(async (req, res) => {
  try {
    const { category, name, type, page = 1, limit = 25 } = req.query;

    const skip = (page - 1) * limit;

    // Step 1: Find vendors who have active offers
    const vendorsWithActiveOffers = await Offer.distinct("vendor", {
      status: "active",
    });

    // Step 2: Build base query
    let query = {
      user: { $in: vendorsWithActiveOffers },
    };

    // Step 3: Apply filters in DB (NOT after fetching)
    if (name) {
      query.business_name = new RegExp(name.trim(), "i");
    }

    if (category && mongoose.Types.ObjectId.isValid(category.trim())) {
      query.category = category.trim();
    }

    // Step 4: Count total before pagination
    const totalVendors = await Vendor.countDocuments(query);

    // Step 5: Fetch paginated results
    let vendors = await Vendor.find(query)
      .populate({
        path: "user",
        match: { deleted_at: null },
      })
      .populate("category")
      .populate("subcategory")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Step 6: If no data found for the page, return empty list (NOT 404)
    if (!vendors || vendors.length === 0) {
      return successResponse(res, "No vendors found", 200, {
        data: [],
        total_records: 0,
        current_page: Number(page),
        per_page: Number(limit),
        total_pages: 0,
        nextPage: null,
        previousPage: null,
      });
    }

    // Step 7: Get offers for each vendor
    const vendorsWithOffers = await getVendorsWithMaxOffer(vendors);

    const totalPages = Math.ceil(totalVendors / limit);

    return successResponse(res, "Vendors retrieved successfully", 200, {
      data: vendorsWithOffers,
      total_records: totalVendors,
      current_page: Number(page),
      per_page: Number(limit),
      total_pages: totalPages,
      nextPage: page < totalPages ? Number(page) + 1 : null,
      previousPage: page > 1 ? Number(page) - 1 : null,
    });
  } catch (error) {
    console.log("error", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getVendorById = catchAsync(async (req, res) => {
  try {
    const _id = req.params.id;
    // console.log("_id", _id);
    if (!_id) {
      return validationErrorResponse(res, "Vendor Id not found", 404);
    }
    const user_id = req.query.user_id;
    let record = await Vendor.findOne({ user: _id })
      .populate("user")
      .populate("added_by")
      .populate("category")
      .populate("subcategory");

    if (!record) {
      return validationErrorResponse(res, "Vendor not found", 404);
    }
    const offers = await Offer.find({ vendor: _id, status: "active" })
      .populate("flat")
      .populate("percentage");

    if (!offers || offers.length === 0) {
      return validationErrorResponse(res, "No active offers found", 404);
    }

    console.log("record", record);
    const updatedOffers = await Promise.all(
  offers.map(async (offer) => {
    const query = { offer: offer._id };

    // only add user to query if user_id exists
    if (user_id) {
      query.user = user_id;
    }

    const existingBuy = await OfferBuy.findOne(query);

    const purchase_status = existingBuy ? true : false;
    return { ...offer.toObject(), purchase_status };
  })
);

    const vendorsWithActiveOffers = await Offer.distinct("vendor", {
      status: "active",
    });

    const similar = await Vendor.find({
      category: record?.category?._id,
      user: { $in: vendorsWithActiveOffers },
    })
      .select(
        "state area city business_name business_image address business_logo vendor category user subcategory lat long"
      )
      .populate("user")
      .populate("category")
      .populate("subcategory")
      .limit(5);
    const similarVendor = await getVendorsWithMaxOffer(similar);
    // console.log("similarVendor", similarVendor);
    // After fetching similar vendors
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const similarWithDistance = similarVendor.map((v) => {
      // v.vendor contains lat/long
      const vendorLat = 26.93018694624354;
      const vendorLong = 75.78562232566131;
      let distance = null;

      if (vendorLat && vendorLong && record.lat && record.long) {
        let arg =
          Math.sin(toRad(record.lat)) * Math.sin(toRad(vendorLat)) +
          Math.cos(toRad(record.lat)) *
            Math.cos(toRad(vendorLat)) *
            Math.cos(toRad(vendorLong) - toRad(record.long));
        arg = Math.min(1, Math.max(-1, arg));
        distance = R * Math.acos(arg);
        distance = Math.round(distance * 100) / 100;
      }

      // Just spread v because it’s already a plain object
      return {
        ...v,
        distance,
      };
    });

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
      business_logo: record.business_logo,
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
      country: record?.country,
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

    // console.log("vendorObj", vendorObj)
    const transformed = {
      _id: record._id,
      uuid: record.uuid,
      // document: documentObj,
      business_details: businessObj,
      timing: timingObj,
      vendor: record.user,
      offers: updatedOffers,
      similar: similarWithDistance,
      sales: record.added_by,
      status: record.status,
      Verify_status: record.Verify_status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      percentages,
    };

    return successResponse(
      res,
      "Vendor details fetched successfully",
      200,
      transformed
    );
  } catch (error) {
    console.log("error", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.CustomerDashboard = catchAsync(async (req, res) => {
  try {
    const lat = req.params.lat ? parseFloat(req.params.lat) : 26.93018694624354;
    const long = req.params.long
      ? parseFloat(req.params.long)
      : 75.78562232566131;

    const vendorsWithActiveOffers = await Offer.distinct("vendor", {
      status: "active",
    });

    // Count offers for popularity
    const result = await OfferBuy.aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: "$vendor",
          offerCount: { $sum: 1 },
        },
      },
    ]);

    // Map for quick lookup
    const offerCountMap = new Map(
      result.map((item) => [item._id.toString(), item.offerCount])
    );

    // --- POPULAR VENDORS ---
    const popular = await Vendor.find({
      user: { $in: vendorsWithActiveOffers },
    })
      .select(
        "business_name address business_logo vendor category user subcategory city state area lat long"
      )
      .populate("category")
      .populate("user")
      .populate("subcategory");

    const popularvendor = await getVendorsWithMaxOffer(popular);

    const popularWithDistance = popularvendor.map((item) => {
      const v = item.vendor || {}; // vendor details are nested here
      const vendorLat = v.lat;
      const vendorLong = v.long;

      const toRad = (deg) => (deg * Math.PI) / 180;
      const R = 6371; // Earth radius in km

      let distance = null;
      if (vendorLat && vendorLong) {
        const d =
          R *
          Math.acos(
            Math.sin(toRad(lat)) * Math.sin(toRad(vendorLat)) +
              Math.cos(toRad(lat)) *
                Math.cos(toRad(vendorLat)) *
                Math.cos(toRad(vendorLong) - toRad(long))
          );

        distance = Math.round(d * 100) / 100; // 2 decimal places
      }

      // Attach distance without mutating original reference
      return {
        ...item,
        distance,
      };
    });

    // Sort only by popularity (offer count)
    const sortedPopularVendors = popularWithDistance.sort((a, b) => {
      const countA = offerCountMap.get(a.vendor?.user?._id?.toString()) || 0;
      const countB = offerCountMap.get(b.vendor?.user?._id?.toString()) || 0;
      return countB - countA;
    });

    // --- NEARBY VENDORS ---
    const nearby = await Vendor.aggregate([
      {
        $match: {
          user: {
            $in: vendorsWithActiveOffers.map(
              (id) => new mongoose.Types.ObjectId(id)
            ),
          },
          lat: { $ne: null },
          long: { $ne: null },
        },
      },
      {
        $addFields: {
          distance: {
            $round: [
              {
                $multiply: [
                  6371,
                  {
                    $acos: {
                      $add: [
                        {
                          $multiply: [
                            { $sin: { $degreesToRadians: lat } },
                            { $sin: { $degreesToRadians: "$lat" } },
                          ],
                        },
                        {
                          $multiply: [
                            { $cos: { $degreesToRadians: lat } },
                            { $cos: { $degreesToRadians: "$lat" } },
                            {
                              $cos: {
                                $subtract: [
                                  { $degreesToRadians: "$long" },
                                  { $degreesToRadians: long },
                                ],
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                ],
              },
              2,
            ],
          },
        },
      },
      { $sort: { distance: 1 } },
      { $limit: 20 },
      {
        $project: {
          _id: 1,
          business_name: 1,
          address: 1,
          business_logo: 1,
          category: 1,
          subcategory: 1,
          user: 1,
          lat: 1,
          long: 1,
          distance: 1,
          state: 1,
          city: 1,
          area: 1,
        },
      },
    ]);

    const nearbyVendorsPopulated = await Vendor.populate(nearby, [
      { path: "category", select: "_id name id" },
      { path: "subcategory", select: "_id subcategory_id name category_id" },
      { path: "user", select: "_id name phone email avatar" },
    ]);

    const nearbyvendor = await getVendorsWithMaxOffer(nearbyVendorsPopulated);

    const categoryList = await categories.find({});

    // Prepare category → vendor array structure
    const categoryMap = {};
    categoryList.forEach((cat) => {
      categoryMap[cat._id.toString()] = {
        ...cat._doc,
        vendors: [],
      };
    });

    // Combine all vendors (popular + nearby)
    const combinedVendors = await Vendor.find({
      user: { $in: vendorsWithActiveOffers },
    })
      .select(
        "business_name address business_logo vendor category user subcategory city state area lat long"
      )
      .populate("category")
      .populate("user")
      .populate("subcategory");

    // Run all vendors through getVendorsWithMaxOffer BEFORE grouping
    const vendorsAfterOfferCalc = await getVendorsWithMaxOffer(combinedVendors);

    // Now attach vendors to categories
    vendorsAfterOfferCalc.forEach((item) => {
      const v = item.vendor || item; // fallback
      const catId = v?.category?._id?.toString();

      if (catId && categoryMap[catId]) {
        categoryMap[catId].vendors.push(item);
      }
    });

    // Remove empty categories
    const filteredCategories = Object.values(categoryMap).filter(
      (cat) => cat.vendors.length > 0
    );

    return successResponse(res, "Dashboard successfully", 200, {
      popularvendor: sortedPopularVendors,
      nearbyvendor,
      category: filteredCategories,
    });
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.OfferBrought = catchAsync(async (req, res) => {
  try {
    const id = req?.user?.id;

    // Pagination inputs
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Total records
    const total_records = await OfferBuy.countDocuments({ user: id });

    // Calculate total pages
    const total_pages = Math.ceil(total_records / limit);

    // Fetch paginated records
    const allPurchases = await OfferBuy.find({ user: id })
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

    // Always return 200, even if no data for this page
    return successResponse(res, "Brought offers fetched successfully", 200, {
      purchased_customers: allPurchases,
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

exports.OfferBroughtById = catchAsync(async (req, res) => {
  try {
    const id = req?.params?.id;
    const record = await OfferBuy.findById(id)
      .populate("user")
      .populate("offer")
      .populate("vendor")
      .populate("payment_id")
      .populate({
        path: "offer",
        populate: [{ path: "flat" }, { path: "percentage" }],
      });
    console.log("record", record);
    if (!record) {
      return validationErrorResponse(res, " Brought Offer not found", 404);
    }
    return successResponse(
      res,
      "Brought Offer Detail fetched successfully",
      200,
      record
    );
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

const attachVendorLogos = async (records) => {
  return Promise.all(
    records.map(async (item) => {
      const vendorUserId = item?.vendor?._id;

      if (!vendorUserId) {
        item.vendor_logo = null;
        return item;
      }
      // console.log("item before", item);

      // Find vendor entry in Vendor table
      const vendorData = await Vendor.findOne({ user: vendorUserId }).lean();
      // console.log("vendorData", vendorData?.business_logo);

      item.vendor.business_logo = vendorData?.business_logo || null;
      item.vendor.business_name = vendorData?.business_name || null;
      // console.log("item after", item);

      return item;
    })
  );
};

exports.RedeemedOffers = catchAsync(async (req, res) => {
  try {
    const id = req?.user?.id;
    const { page = 1, limit = 20 } = req.query;

    if (!id) {
      return validationErrorResponse(res, "User ID is required", 400);
    }
    const skip = (page - 1) * limit;

    let record = await OfferBuy.find({ user: id, vendor_bill_status: true })
      .populate("user")
      .populate("offer")
      .populate("vendor")
      .populate("payment_id")
      .populate({
        path: "offer",
        populate: [{ path: "flat" }, { path: "percentage" }],
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    record = await attachVendorLogos(record);

    // ✅ Count total records
    const total_records = await OfferBuy.countDocuments({
      user: id,
      vendor_bill_status: true,
    });
    const total_pages = Math.ceil(total_records / limit);

    if (!record) {
      return validationErrorResponse(res, "Offers not found", 200);
    }

    return successResponse(res, "Brought offers fetched successfully", 200, {
      redeemed_offers: record,
      total_records,
      current_page: Number(page),
      per_page: Number(limit),
      total_pages,
      nextPage: page < total_pages ? Number(page) + 1 : null,
      previousPage: page > 1 ? Number(page) - 1 : null,
    });
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.PaymentGetByUser = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("userId", userId);
    const record = await Payment.find({ user: userId });
    if (!record || record.length === 0) {
      return validationErrorResponse(res, "No Users found", 404);
    }
    return successResponse(res, "payment fetched successfully", 200, record);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.AddPayment = catchAsync(async (req, res) => {
  try {
    const userid = req.user.id;
    const { amount, currency, offer_id, vendor_id } = req.body;

    console.log("req.body", req.body);

    const razorpay = new Razorpay({
      key_id: "rzp_test_RQ3O3IWq0ayjsg",
      key_secret: "RcwuasbTHAdmm1mrZTiigw2x",
    });

    // ✅ Pehle ORDER create karen with notes
    const orderOptions = {
      amount: amount * 100,
      currency: currency || "INR",
      receipt: "rcpt_" + Math.random().toString(36).substring(7),
      notes: {
        // ✅ Notes yahan add karen
        offer_id: offer_id,
        vendor_id: vendor_id,
        userid: userid,
      },
    };

    const order = await razorpay.orders.create(orderOptions);
    console.log("✅ Order created with notes:", order);

    return successResponse(res, "Order created successfully", 200, order);
  } catch (err) {
    console.error("Error creating order:", err);
    return errorResponse(res, err.message || "Internal Server Error", 500);
  }
});

exports.EditCustomerPerson = catchAsync(async (req, res) => {
  try {
    const id = req.user.id;
    const { name, email } = req.body;

    const user = await User.findById(id);
    if (!user || user.deleted_at) {
      return validationErrorResponse(res, "Customer not found.", 404);
    }

    if (name) user.name = name;
    if (email) user.email = email;
    // if (phone) user.phone = phone;
    // console.log("user", user);

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
      "Customer updated successfully.",
      200,
      updatedUser
    );
  } catch (error) {
    console.error("Customer update error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.UpdateCustomerAmount = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;
    let { total_amount } = req.body;
    total_amount = Number(total_amount);

    if (!id) {
      return validationErrorResponse(res, "Missing offer ID", 400);
    }

    // ❗ Validate number
    if (isNaN(total_amount)) {
      return validationErrorResponse(res, "Total amount must be a valid number", 400);
    }

    const record = await OfferBuy.findById(id).populate({
      path: "offer",
      populate: [{ path: "flat" }, { path: "percentage" }],
    });

    if (!record) {
      return validationErrorResponse(res, "No offer found", 404);
    }

    // return successResponse(res, "Vendor amount updated successfully", 200, record);

    let discount = 0,
      final = total_amount;

    if (record?.offer?.percentage && record?.offer?.type === "percentage") {
      const offerData = record.offer.percentage;

      // ✅ Check minimum bill amount
      if (total_amount < offerData.minBillAmount) {
        return validationErrorResponse(
          res,
          `Minimum bill amount should be ₹${offerData.minBillAmount} to apply this offer.`,
          400
        );
      }

      // ✅ Calculate discount (bounded by maxDiscountCap)
      discount = Math.min(
        offerData.maxDiscountCap,
        (offerData.discountPercentage * total_amount) / 100
      );

      final = total_amount - discount;
    } else if (record?.offer?.type === "flat") {
      const offerData = record.offer.flat;
      if (total_amount < offerData.minBillAmount) {
        return validationErrorResponse(
          res,
          `Minimum bill amount should be ₹${offerData.minBillAmount} to apply this offer.`,
          400
        );
      }
      discount = offerData?.discountPercentage;
      final = total_amount - discount;
    } else {
      console.log("invalid offer type");
    }

    // Optionally update record fields if you want to persist
    record.discount = discount;
    record.total_amount = total_amount;
    record.final_amount = final;
    await record.save();

    return successResponse(
      res,
      "Vendor amount updated successfully",
      200,
      record
    );
  } catch (error) {
    console.error("Error updating amount:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.CustomerAddBill = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return validationErrorResponse(res, "ID is required", 400);
    }

    const record = await OfferBuy.findById(id).populate({
      path: "offer",
      populate: [{ path: "flat" }, { path: "percentage" }],
    });

    if (!record) {
      return validationErrorResponse(res, "No offer found", 404);
    }

    if (!req.file || !req.file.filename) {
      return validationErrorResponse(res, "Bill file is required", 400);
    }

    if (record.bill) {
      try {
        await deleteUploadedFiles([record.bill]);
      } catch (err) {
        console.log("Failed to delete old bill:", err.message);
      }
    }

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`;
    record.bill = fileUrl;

    await record.save();

    return successResponse(
      res,
      "Bill added successfully",
      200,
      record
    );
  } catch (error) {
    console.error("Error updating amount:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getVendorGallery = catchAsync(async (req, res) => {
  try {
    const user = req.params.id;
    const data = await Vendor.findOne({ user: user }).select("business_image");
    if (!data) {
      return validationErrorResponse(res, "Vendor not found", 200);
    }
    return successResponse(res, "Gallery fetched successfully", 200, data);
  } catch (error) {
    console.log("Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

// customer phone number
exports.customerphoneUpdate = catchAsync(async (req, res) => {
  try {
    const vendorId = req.user?.id || req.params.id;
    if (!vendorId) {
      return validationErrorResponse(res, "Customer ID missing", 400);
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
    return successResponse(res, "Customer updated successfully", 200, {
      vendordata,
    });
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.eligibleOffers = catchAsync(async (req, res) => {
  try {
    const { vendorId, offerId, bill } = req.query;

    if (!vendorId || !offerId || !bill) {
      return validationErrorResponse(
        res,
        "vendorId, offerId and bill are required",
        400
      );
    }

    const billAmount = Number(bill);
    if (isNaN(billAmount) || billAmount <= 0) {
      return validationErrorResponse(res, "Invalid bill amount", 400);
    }

    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);
    const currentOfferId = new mongoose.Types.ObjectId(offerId);

    const currentOffer = await Offer.findById(currentOfferId)
      .populate("percentage")
      .populate("flat");

    if (!currentOffer) {
      return validationErrorResponse(res, "Current offer not found", 400);
    }

    const currentOfferAmount =
      currentOffer.type === "percentage"
        ? currentOffer.percentage?.amount || 0
        : currentOffer.flat?.amount || 0;

    // console.log("currentOfferAmount", currentOfferAmount);

    let currentDiscount = 0;

    if (currentOffer.type === "percentage" && currentOffer.percentage) {
      const o = currentOffer.percentage;
      currentDiscount = Math.min(
        o.maxDiscountCap,
        (o.discountPercentage * billAmount) / 100
      );
    } else if (currentOffer.type === "flat" && currentOffer.flat) {
      currentDiscount = currentOffer.flat.discountPercentage;
    }

    // console.log("currentDiscount", currentDiscount);

    const offers = await Offer.find({
      vendor: vendorObjectId,
      status: "active",
      _id: { $ne: currentOfferId },
    })
      .populate("percentage")
      .populate("flat");

    // console.log("offers", offers);

    let bestOffer = null;

    for (const offer of offers) {
      let targetAmount = 0;
      let discount = 0;
      let minimum_bill_amount = 0;

      if (offer.type === "percentage" && offer.percentage) {
        const o = offer.percentage;
        if (o.isExpired || new Date(o.expiryDate) < new Date()) continue;
        targetAmount = o.amount || 0;
        discount = Math.min(o.maxDiscountCap,(o.discountPercentage*billAmount)/100);
        minimum_bill_amount = offer?.percentage?.minBillAmount;
      }
      else if (offer.type === "flat" && offer.flat) {
        const o = offer.flat;
        if (o.isExpired || new Date(o.expiryDate) < new Date()) continue;
        targetAmount = o.amount || 0;
        discount = o.discountPercentage;
        minimum_bill_amount = offer?.flat?.minBillAmount;
      }

      // console.log("targetAmount", targetAmount);
      // console.log("discount", discount);

      if (targetAmount <= currentOfferAmount) continue;
      if (discount <= currentDiscount) continue;

      const amountRequiredToUpgrade = targetAmount - currentOfferAmount;
      const additionalAmountToShop = Math.max(0, minimum_bill_amount - billAmount);

      if (!bestOffer || amountRequiredToUpgrade < bestOffer.amount_required_to_upgrade) {
        bestOffer = {
          offer,
          // discount,
          additionalAmountToShop,
          amount_required_to_upgrade: amountRequiredToUpgrade,
          new_offer_amount: targetAmount,
        };
      }
    }
    return successResponse(res,"Eligible upgrade offer fetched successfully",200,{eligibleOffer: bestOffer,});
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.offerUpgrade = catchAsync(async (req, res) => {
  try {
    // const userId = req.body.userId;
    const userId = req.user.id;
    const { old_offer_buy_id, new_offer_id, currency } = req.body;

    if (!old_offer_buy_id || !new_offer_id) {
      return errorResponse(res, "Old Offer Id and New Offer Id are required", 400);
    }

    // 1️⃣ Fetch the exact offer the user wants to upgrade
    const currentOfferBuy = await OfferBuy.findById(old_offer_buy_id).populate("offer vendor payment_id");

    if (!currentOfferBuy) {
      return errorResponse(res, "Offer not found or not eligible for upgrade", 400);
    }

    // 2️⃣ Fetch new offer
    const newOffer = await Offer.findById(new_offer_id).populate("vendor flat percentage");

    if (!newOffer) {
      return errorResponse(res, "New offer not found", 200);
    }

    // 3️⃣ Vendor validation (CRITICAL)
    if (currentOfferBuy.vendor._id.toString() !== newOffer.vendor._id.toString()) {
      return errorResponse(res, "Cross-vendor upgrade not allowed", 400);
    }

    // 4️⃣ Price calculation
    const oldAmount = currentOfferBuy?.payment_id?.amount || 0;

    // ⚠️ Replace this with your actual pricing logic
    const newAmount = newOffer?.flat?.amount || newOffer?.percentage?.amount || 0;

    if (newAmount <= oldAmount) {
      return errorResponse(res, "Upgrade amount must be greater than current offer", 400);
    }

    const upgradeAmount = newAmount - oldAmount;

    // 5️⃣ Resolve upgrade chain root
    const upgradeChainRoot =
      currentOfferBuy.upgrade_chain_root || currentOfferBuy._id;

    // 6️⃣ Razorpay instance
    const razorpay = new Razorpay({
      key_id: "rzp_test_Rxncr3PhssgP4K",
      key_secret: "3EFVLS4DwGe1lwEayh3HzzNx",
    });

    // 7️⃣ Create Razorpay order
    const orderOptions = {
      amount: upgradeAmount * 100,
      currency: currency || "INR",
      receipt: `upgrade_${Date.now()}`,
      payment_capture: 1,
      notes: {
        payment_type: "upgrade",
        userid: userId,
        vendor_id: currentOfferBuy.vendor._id.toString(),
        old_offer_buy_id: currentOfferBuy._id.toString(),
        new_offer_id: new_offer_id,
        upgrade_chain_root: upgradeChainRoot.toString(),
      },
    };

    const order = await razorpay.orders.create(orderOptions);

    return successResponse(res, "Upgrade order created successfully", 200, {
      order,
      upgradeAmount,
      oldOffer: currentOfferBuy.offer,
      newOffer,
    });
  } catch (error) {
    console.error("❌ Offer upgrade error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});