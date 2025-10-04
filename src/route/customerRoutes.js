const { CustomerRegister, VendorGet, CustomerGet, VendorOfferGet, GetOfferById} = require("../controller/CustomerController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.post("/customer/add",  CustomerRegister);
router.get("/customer/get_details", verifyToken, CustomerGet);
router.get("/customer/getVendor", verifyToken, VendorGet);
router.get("/customer/getVendorOffers/:id", verifyToken, VendorOfferGet);
router.get("/offer/get_details/:id", GetOfferById);

module.exports = router;