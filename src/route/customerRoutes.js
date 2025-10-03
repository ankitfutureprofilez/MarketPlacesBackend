const { CustomerRegister, VendorGet } = require("../controller/CustomerController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.post("/customer/add",  CustomerRegister);
router.get("/customer/get_details", verifyToken, GetOfferId);
router.get("/customer/getVendor", verifyToken, VendorGet);

module.exports = router;