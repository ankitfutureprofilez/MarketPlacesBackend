const router = require("express").Router();
const { CustomerRegister, VendorGet, CustomerGet, VendorOfferGet, GetOfferById, CustomerDashboard, OfferBrought, PaymentGetByUser, AddPayment, getVendorById, EditCustomerPerson ,UpdateCustomerAmount, getVendorGallery, OfferBroughtById } = require("../controller/CustomerController");
const { verifyToken } = require("../utils/tokenVerify");
const upload = require("../utils/uploader");

router.post("/customer/register", CustomerRegister);
router.get("/customer/get_details", verifyToken, CustomerGet);
router.get("/customer/getVendor", VendorGet);
router.get("/customer/getVendorbyId/:id", getVendorById);
router.get("/customer/getVendorOffers/:id", verifyToken, VendorOfferGet);
router.get("/customer/offer/get_details/:id" , GetOfferById);
router.get("/customer/dashboard", CustomerDashboard);
router.get("/customer/brought-offer",verifyToken, OfferBrought);
router.get("/customer/brought-offer/:id",verifyToken, OfferBroughtById);
router.get("/customer/payment_get", verifyToken, PaymentGetByUser);
router.post("/customer/add_payment",verifyToken, AddPayment);
router.post("/customer/update",verifyToken, upload.single("avatar"), EditCustomerPerson);
router.post("/customer/payment/update/:id", UpdateCustomerAmount);
router.get("/customer/vendor-gallery/:id", getVendorGallery);

module.exports = router;