const catchAsync = require("../utils/catchAsync");
const Offer = require("../model/AddOffer.js");

exports.AddOffer = catchAsync(async (req, res) => {
  try {
    const userId = req.user?._id;
    const { title, description, expiryDate, image, discountPercentage, maxDiscountCap, minBillAmount } = req.body;
    const newOffer = new Offer({
      title,
      description,
      expiryDate,
      discountPercentage,
      maxDiscountCap,
      minBillAmount,
      image,
      users: userId
    });

    const record = await newOffer.save();
    return successResponse(res, "Offer created successfully", record);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.GetOfferId = catchAsync(async (req, res) => {
  try {
    const userId = req.user?._id || req.params.id;
    const record = await Offer.findById({ users: userId }).populate("users");
    if (!record) {
      return validationErrorResponse(res, "Vendor not found", 404);
    }
    return successResponse(res, "Vendor details fetched successfully", record);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.OfferStatus = catchAsync(async (req, res) => {
  try {
    const offerId = req.params.id;
    const { status } = req.body;
    const record = await Offer.findByIdAndUpdate(
      offerId,
      { status },
      { new: true }
    );
    if (!record) {
      return validationErrorResponse(res, "Offer not found", 404);
    }
    return successResponse(res, "Offer status updated successfully", record);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.EditOffer = catchAsync(async (req, res) => {
  try {
    const { title, description, expiryDate, image, discountPercentage, maxDiscountCap, minBillAmount, Id } = req.body;
    const record = await Offer.findByIdAndUpdate(Id, { title, description, expiryDate, image,
       discountPercentage,
       maxDiscountCap, minBillAmount }, { new: true });
    return successResponse(res, "Offer created successfully", record);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
})
