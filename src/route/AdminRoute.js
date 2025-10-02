const { VendorGet, SalesGet, UserGet, Login, adminGet, VendorRegister, VendorGetId } = require("../controller/AdminController");
const { SalesPersonStatus, AddSalesPersons } = require("../controller/SalesController");
const { VendorStatus, AdminSubcaterites } = require("../controller/VendorController");
const { verifyToken } = require("../controller/AuthController");

const router = require("express").Router();

router.post("/login", Login);

router.get("/vendor_list", VendorGet);

router.get("/sales_list", SalesGet);

router.get("/user_list", UserGet);

router.get("/vendor_status/:id/:status", VendorStatus);


router.get("/sales_status/:id/:status", SalesPersonStatus);

router.post("/sales_add", AddSalesPersons);

router.get("/profile-token", verifyToken, adminGet);


router.post("/vendor-add", verifyToken, VendorRegister);


router.get("/subcatgroy/:id", AdminSubcaterites);

router.get("/vendor_details/:id", VendorGetId);



module.exports = router;