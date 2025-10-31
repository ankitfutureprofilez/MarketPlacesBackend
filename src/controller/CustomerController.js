const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../model/User");
const Vendor = require("../model/Vendor");
const Offer = require("../model/Offer.js");
const OfferBuy = require("../model/OfferBuy.js");
const catchAsync = require("../utils/catchAsync");
const { successResponse, errorResponse, validationErrorResponse } = require("../utils/ErrorHandling.js");
const categories = require("../model/categories.js");
const Razorpay = require("razorpay");
const Payment = require("../model/Payment.js");

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
      return errorResponse(res, "No customers found", 404);
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
    const user_id = req.user.id
    console.log("user_id", user_id)
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

    console.log("updatedOffers", updatedOffers)

    if (!record || record.length === 0) {
      return validationErrorResponse(res, "Offer not found", 404);
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
    const userId = req.query?.user_id
    const offerId = req.params.id.trim();

    const record = await Offer.findById(offerId)
      .populate("vendor")
      .populate("flat")
      .populate("percentage");

    if (!record) {
      return validationErrorResponse(res, "Offer not found", 404);
    }

    const existingBuy = await OfferBuy.findOne({
      offer: offerId,
      user: userId,
    });

    console.log("existingBuy", existingBuy)

    const userOfferStatus = existingBuy ? true : false;

    const offerBuys = await OfferBuy.find({ offer: offerId })
      .populate("user")
      .populate("vendor")
      .populate("payment_id")
      .populate("offer");

    const totalBuys = offerBuys.length;
    const redeemCount = offerBuys.filter(b => b.status === "redeemed").length;
    const pendingCount = offerBuys.filter(b => b.status === "active").length;
    const expiredCount = offerBuys.filter(b => b.status === "expired").length;

    // ✅ 6. Send unified response
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
    const { category, name, type } = req.query;

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
        const matchesCategory = categoryRegex
          ? categoryRegex.test(catName)
          : true;
        return matchesName && matchesCategory;
      });
    }

    if (!vendors || vendors.length === 0) {
      return errorResponse(res, "No vendors found", 404);
    }
    const vendorsWithOffers = await getVendorsWithMaxOffer(vendors);

    return successResponse(res, "Vendor retrieved successfully", 200, vendorsWithOffers);
  } catch (error) {
    console.log("error", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getVendorById = catchAsync(async (req, res) => {
  try {
    const _id = req.params.id;
    const user_id = req.query.user_id
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

    // 2️⃣ For each offer, check if user has already used/bought it
    const updatedOffers = await Promise.all(
      offers.map(async (offer) => {
        const existingBuy = await OfferBuy.findOne({
          offer: offer._id,
          user: user_id,
        });

        const purchase_status = existingBuy ? true : false;
        return { ...offer.toObject(), purchase_status };
      })
    );

    console.log("updatedOffers", updatedOffers)
    const vendorsWithActiveOffers = await Offer.distinct("vendor", {
      status: "active",
    });

    const similar = await Vendor.find({ category: record.category._id, user: { $in: vendorsWithActiveOffers } })
      .select("state area city business_name business_image address business_logo vendor category user subcategory lat long")
      .populate("user")
      .populate("category")
      .populate("subcategory").limit(5);
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
      percentages
    };

    return successResponse(res, "Vendor details fetched successfully", 200, transformed);

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
})

exports.CustomerDashboard = catchAsync(async (req, res) => {
  try {
    const lat = req.params.lat ? parseFloat(req.params.lat) : 26.93018694624354;
    const long = req.params.long ? parseFloat(req.params.long) : 75.78562232566131;

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

    const category = await categories.find({});

    return successResponse(res, "Dashboard successfully", 200, {
      popularvendor: sortedPopularVendors,
      nearbyvendor,
      category,
    });
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.OfferBrought = catchAsync(async (req, res) => {
  try {
    const id = req?.user?.id;
    const record = await OfferBuy.find({ user: id })
      .populate("user")
      .populate("offer")
      .populate("vendor")
      .populate("payment_id")
      .populate({
        path: "offer",
        populate: [
          { path: "flat" },
          { path: "percentage" }
        ],
      });
    if (!record) {
      return validationErrorResponse(res, "Offers not found", 404);
    }
    return successResponse(res, "Brought offers fetched successfully", 200, record);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);

  }
});

exports.PaymentGetByUser = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("userId", userId)
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

    const razorpay = new Razorpay({
      key_id: "rzp_test_RQ3O3IWq0ayjsg",
      key_secret: "RcwuasbTHAdmm1mrZTiigw2x",
    });

    // ✅ Pehle ORDER create karen with notes
    const orderOptions = {
      amount: amount * 100,
      currency: currency || "INR",
      receipt: "rcpt_" + Math.random().toString(36).substring(7),
      notes: {  // ✅ Notes yahan add karen
        offer_id: offer_id || "68edff002c5753929286bfac",
        vendor_id: vendor_id || "68edfeb22c5753929286bfa1",
        userid: userid || "68edfb9be37a34d7bc1e2412",
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



