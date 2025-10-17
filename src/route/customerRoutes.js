const router = require("express").Router();
const { CustomerRegister, VendorGet, CustomerGet, VendorOfferGet, GetOfferById, CustomerDashboard, OfferBrought, PaymentGetByUser, AddPayment } = require("../controller/CustomerController");
const { verifyToken } = require("../utils/tokenVerify");

router.post("/customer/register", CustomerRegister);
router.get("/customer/get_details", verifyToken, CustomerGet);
router.get("/customer/getVendor", VendorGet);
router.get("/customer/getVendorOffers/:id", verifyToken, VendorOfferGet);
router.get("/customer/offer/get_details/:id", verifyToken, GetOfferById);
router.get("/customer/dashboard", CustomerDashboard);
router.get("/customer/brought-offer", verifyToken, OfferBrought);
router.get("/customer/payment_get", verifyToken, PaymentGetByUser);
router.post("/customer/add_payment", AddPayment);



module.exports = router;