const {  VendorGet, SalesGet, UserGet } = require("../controller/AdminController");

const router = require("express").Router();

router.post("/admin/login", Adminlogin);

router.post("/vendor_list", VendorGet);

router.get("/sales_list", SalesGet);

router.get("/user_list", UserGet);

module.exports = router;