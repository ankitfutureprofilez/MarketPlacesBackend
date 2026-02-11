const { VendorGetAll, VendorStatus, VendorRegister, SalesGetId, AddSalesPersons, SalesphoneUpdate, EditSalesPerson, OTPVerify, vendorUpdate, VendorSalesGetId, SalesPersonGet, Dashboard } = require("../controller/SalesController");
const { verifyToken } = require("../utils/tokenVerify");
const upload = require("../utils/uploader");
const router = require("express").Router();

router.get("/sales/vendor", verifyToken, VendorGetAll);
router.post("/sales/vendor_status", VendorStatus);
router.post("/sales/vendor-add",verifyToken,
  upload.fields([
    // Address proofs
    { name: "aadhaar_front", maxCount: 1 },
    { name: "aadhaar_back", maxCount: 1 },
    { name: "pan_card_image", maxCount: 1 },
    { name: "driving_license", maxCount: 1 },
    { name: "passport", maxCount: 1 },
    // Business proofs
    { name: "gst_certificate", maxCount: 1 },
    { name: "udhyam", maxCount: 1 },
    { name: "trade_license", maxCount: 1 },
    { name: "shop_license", maxCount: 1 },
    // Business logo
    { name: "business_logo", maxCount: 1 },
  ]),VendorRegister);
router.post("/sales/vendor-update/:id", verifyToken,
  upload.fields([
    // Address proofs
    { name: "aadhaar_front", maxCount: 1 },
    { name: "aadhaar_back", maxCount: 1 },
    { name: "pan_card_image", maxCount: 1 },
    { name: "driving_license", maxCount: 1 },
    { name: "passport", maxCount: 1 },
    // Business proofs
    { name: "gst_certificate", maxCount: 1 },
    { name: "udhyam", maxCount: 1 },
    { name: "trade_license", maxCount: 1 },
    { name: "shop_license", maxCount: 1 },
    // Business logo
    { name: "business_logo", maxCount: 1 },
  ]), vendorUpdate);
router.get("/sales/dashboard", verifyToken, Dashboard);

router.get("/sales/sales_id/:id", SalesGetId);
router.post("/sales/phone-update", verifyToken, SalesphoneUpdate);
router.post("/sales/update", verifyToken, upload.single("avatar"), EditSalesPerson);
router.post("/sales/otp", OTPVerify);
router.get("/sales/vendor_details/:id", VendorSalesGetId);
router.get("/sales/profile", verifyToken, SalesPersonGet);

module.exports = router; 