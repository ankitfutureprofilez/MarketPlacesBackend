const cron = require("node-cron");
const mongoose = require("mongoose");
const FlatOffer = require("../src/model/FlatOffer"); // adjust path if needed
const PercentageOffer = require("../src/model/PercentageOffer"); // adjust path if needed

// Run every day at midnight (00:00)
cron.schedule("5 0 * * *", async () => {
  try {
    console.log(" Running offer expiry check...");

    const now = new Date();

    // Update all offers where expiryDate <= now and not yet expired
    const result = await FlatOffer.updateMany(
      { expiryDate: { $lte: now }, isExpired: false },
      { $set: { isExpired: true } }
    );

    if (result.modifiedCount > 0) {
      console.log(` ${result.modifiedCount} offers marked as expired.`);
    } else {
      console.log(" No offers expired today.");
    }

     const results = await PercentageOffer.updateMany(
      { expiryDate: { $lte: now }, isExpired: false },
      { $set: { isExpired: true } }
    );

    if (results.modifiedCount > 0) {
      console.log(` ${results.modifiedCount} offers marked as expired.`);
    } else {
      console.log(" No offers expired today.");
    }
  } catch (error) {
    console.error(" Error in offer expiry job:", error);
  }
});
