const {  VendorGet, SalesGet, UserGet, Adminlogin, adminGet } = require("../controller/AdminController");
const { SalesPersonStatus, AddSalesPersons } = require("../controller/SalesController");
const { VendorStatus } = require("../controller/VendorController");

const router = require("express").Router();

router.post("/login", Adminlogin);

router.get("/vendor_list", VendorGet);

router.get("/sales_list", SalesGet);

router.get("/user_list", UserGet);

router.get("/vendor_status/:id/:status" ,  VendorStatus);


router.get("/sales_status/:id/:status" ,  SalesPersonStatus);

router.post("/sales_add" ,  AddSalesPersons);

router.post("/profile-token" ,  adminGet);



module.exports = router;