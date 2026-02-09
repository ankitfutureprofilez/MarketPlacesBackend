const Home = require("../model/Home");
const { errorResponse, successResponse, validationErrorResponse } = require("../utils/ErrorHandling");
const logger = require("../utils/Logger");
const catchAsync = require("../utils/catchAsync");

const validateOfferSlabs = (slabs = []) => {
  if (!Array.isArray(slabs)) {
    throw new Error("offers_price must be an array");
  }
  slabs.sort((a, b) => a.minDiscount - b.minDiscount);
  for (let i = 0; i < slabs.length; i++) {
    const slab = slabs[i];
    if (slab.minDiscount >= slab.maxDiscount) {
      throw new Error(`Invalid slab range: ${slab.minDiscount}-${slab.maxDiscount}`);
    }
    if (i > 0) {
      const prev = slabs[i - 1];
      if (slab.minDiscount < prev.maxDiscount) {
        throw new Error(`Overlapping slabs detected between ${prev.minDiscount}-${prev.maxDiscount} and ${slab.minDiscount}-${slab.maxDiscount}`);
      }
    }
  }
};

exports.homeAdd = catchAsync(async (req, res) => {
  try {
    const {term_condition, privacy_policy, offers_price = [] } = req.body;
    validateOfferSlabs(offers_price);
    const existing = await Home.findOne({});
    if (existing) {
      return validationErrorResponse(res, "Home configuration already exists", 400);
    }
    const record = await Home.create({ term_condition, privacy_policy, offers_price });
    logger.info("Home created successfully");
    return successResponse(res, "Home created successfully!", 201, record);
  } catch (error) {
    logger.error(error);
    return errorResponse(res, error.message, 500);
  }
});

exports.homefind = catchAsync(async (req, res) => {
  const record = await Home.findOne({});
  return successResponse(res, "Home fetched successfully", 200, record);
});

exports.homeupdate = catchAsync(async (req, res) => {
  try {
    const { term_condition, privacy_policy, offers_price } = req.body;
    if (offers_price) {
      validateOfferSlabs(offers_price);
    }
    const updatedRecord = await Home.findOneAndUpdate(
      {},
      {
        ...(term_condition !== undefined && { term_condition }),
        ...(privacy_policy !== undefined && { privacy_policy }),
        ...(offers_price !== undefined && { offers_price })
      },
      { new: true }
    );

    if (!updatedRecord) {
      return validationErrorResponse(res, "Home data not found", 404);
    }
    logger.info("Home updated successfully");
    return successResponse(res, "Home updated successfully!", 200, updatedRecord);
  } catch (error) {
    logger.error(error);
    return errorResponse(res, error.message, 500);
  }
});