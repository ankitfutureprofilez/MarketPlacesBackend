const { VendorGet, VendorGetId, vendorDelete, vendorUpdate, VendorRegister, category, subcategory, Dashboard, MarkOfferAsUsed, VendorOrder, UpdateAmount, VendorSecondOrder, getPurchasedCustomers, getPayments, uploadGallery, deleteGallery } = require("../controller/VendorController");
const { verifyToken } = require("../utils/tokenVerify");
const upload = require("../utils/uploader");

const router = require("express").Router();

router.post("/vendor/register", VendorRegister);
router.get("/vendor/get", VendorGet);
router.get("/vendor/get_details",verifyToken , VendorGetId);
router.post("/vendor/update", verifyToken,vendorUpdate);
router.get("/vendor/categroy", category);
router.get("/vendor/sub_categroy/:id", subcategory);
router.get("/vendor/order", verifyToken ,VendorOrder);
router.get("/vendor/second-order", verifyToken ,getPurchasedCustomers);

router.get("/vendor/dashboard", verifyToken, Dashboard);
// This api is used for marking the offer brought by the customer as used after scanning

router.get("/vendor/offer/used/:id", verifyToken, MarkOfferAsUsed);

router.post("/vendor/Payment_update", verifyToken, UpdateAmount);
router.get("/vendor/payment/:customer/:offer", verifyToken, getPayments);
router.post("/vendor/gallery/upload", verifyToken, upload.array("files", 5), uploadGallery);
router.post("/vendor/gallery/delete", verifyToken, deleteGallery);

module.exports = router;