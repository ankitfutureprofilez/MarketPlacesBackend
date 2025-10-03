const { VendorGet, VendorGetId, vendorDelete, vendorUpdate, VendorRegister, category, subcategory, Dashboard } = require("../controller/VendorController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.post("/register", VendorRegister);

router.get("/get", VendorGet);

router.get("/get_details/:id", VendorGetId);

router.post("/update", verifyToken,vendorUpdate);

router.post("/delete/:id", vendorDelete);

router.get("/categroy", category);

router.get("/sub_categroy/:id", subcategory);

router.get("/dashboard", verifyToken, Dashboard);

module.exports = router;