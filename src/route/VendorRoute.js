const { VendorGet, VendorGetId, vendorDelete, vendorUpdate, VendorRegister, category, subcategory, Dashboard, MarkOfferAsUsed, VendorOrder, UpdateAmount, VendorSecondOrder, getPurchasedCustomers, getPayments, uploadGallery, deleteGallery, getGallery, vendorphoneUpdate} = require("../controller/VendorController");
const { verifyToken } = require("../utils/tokenVerify");
const upload = require("../utils/uploader");
const router = require("express").Router();

router.post(
  "/vendor/register",
  upload.fields([
    { name: "aadhaar_front", maxCount: 1 },
    { name: "aadhaar_back", maxCount: 1 },
    { name: "pan_card_image", maxCount: 1 },
    { name: "gst_certificate", maxCount: 1 },
    { name: "business_logo", maxCount: 1 },
  ]), VendorRegister);

router.get("/vendor/get", VendorGet);
//this Api work 
router.get("/vendor/get_details", verifyToken, VendorGetId);

router.post("/vendor/update", verifyToken,
  upload.fields([
    { name: "aadhaar_front", maxCount: 1 },
    { name: "aadhaar_back", maxCount: 1 },
    { name: "pan_card_image", maxCount: 1 },
    { name: "gst_certificate", maxCount: 1 },
    { name: "business_logo", maxCount: 1 },
  ]), vendorUpdate);
router.get("/vendor/categroy", category);
router.get("/vendor/sub_categroy/:id", subcategory);
router.get("/vendor/order", verifyToken, VendorOrder);
router.get("/vendor/second-order", verifyToken, getPurchasedCustomers);
router.get("/vendor/dashboard", verifyToken, Dashboard);
router.get("/vendor/offer/used/:id", verifyToken, MarkOfferAsUsed);
router.post("/vendor/payment/approve/:id",verifyToken, UpdateAmount);
router.get("/vendor/payment/:id", verifyToken, getPayments);
router.post(
  "/vendor/gallery/upload",
  verifyToken,
  upload.array("files", 10),
  uploadGallery
);
router.get("/vendor/gallery/get", verifyToken, getGallery);
router.post("/vendor/gallery/delete", verifyToken, deleteGallery);
router.post("/vendor/phone-update", verifyToken, vendorphoneUpdate);

module.exports = router;
