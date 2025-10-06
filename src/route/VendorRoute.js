const { VendorGet, VendorGetId, vendorDelete, vendorUpdate, VendorRegister, category, subcategory, Dashboard } = require("../controller/VendorController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.post("/vendor/register", VendorRegister);
router.get("/vendor/get", VendorGet);
router.get("/vendor/get_details",verifyToken , VendorGetId);
router.post("/vendor/update", verifyToken,vendorUpdate);
router.post("/vendor/delete/:id", vendorDelete);
router.get("/vendor/categroy", category);
router.get("/vendor/sub_categroy/:id", subcategory);
router.get("/vendor/dashboard", verifyToken, Dashboard);

module.exports = router;