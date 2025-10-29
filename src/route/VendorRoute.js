const { VendorGet, VendorGetId, vendorDelete, vendorUpdate, VendorRegister, category, subcategory, Dashboard, MarkOfferAsUsed } = require("../controller/VendorController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.post("/vendor/register", VendorRegister);
router.get("/vendor/get", VendorGet);
router.get("/vendor/get_details",verifyToken , VendorGetId);
router.post("/vendor/update", verifyToken,vendorUpdate);
router.get("/vendor/categroy", category);
router.get("/vendor/sub_categroy/:id", subcategory);
router.get("/vendor/dashboard", verifyToken, Dashboard);
// This api is used for marking the offer brought by the customer as used after scanning
router.get("/vendor/offer/used/:id", verifyToken, MarkOfferAsUsed);

module.exports = router;