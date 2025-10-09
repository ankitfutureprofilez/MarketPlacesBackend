const router = require("express").Router();
const { CustomerRegister, VendorGet, CustomerGet, VendorOfferGet, GetOfferById, CustomerDashboard} = require("../controller/CustomerController");
const { verifyToken } = require("../utils/tokenVerify");

router.post("/customer/register",  CustomerRegister);
router.get("/customer/get_details", verifyToken, CustomerGet);
router.get("/customer/getVendor", verifyToken, VendorGet);
router.get("/customer/getVendorOffers/:id", verifyToken, VendorOfferGet);
router.get("/customer/offer/get_details/:id", verifyToken, GetOfferById);
router.get("/customer/dashboard", CustomerDashboard);


module.exports = router;