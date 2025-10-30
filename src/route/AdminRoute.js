const router = require("express").Router();
const { AdminVendorGet, SalesGet, UserGet, Login, adminGet, VendorRegister, VendorGetId, AdminDashboard, PaymentGet, vendorUpdate, AssignStaff } = require("../controller/AdminController");
const { SalesPersonStatus, AddSalesPersons } = require("../controller/SalesController");
const { VendorStatus, AdminSubcaterites, vendorDelete } = require("../controller/VendorController");
const { verifyToken } = require("../utils/tokenVerify");

router.post("/admin/login", Login);
router.get("/admin/vendor_list", AdminVendorGet);
router.get("/admin/sales_list", SalesGet);
router.get("/admin/user_list", UserGet);
router.get("/admin/vendor_status/:id/:status", VendorStatus);
router.get("/admin/sales_status/:id/:status", SalesPersonStatus);
router.post("/admin/sales_add", AddSalesPersons);
router.get("/admin/profile-token", verifyToken, adminGet);
router.post("/admin/vendor-add", verifyToken, VendorRegister);
router.post("/admin/vendor-Edit", verifyToken, vendorUpdate);
router.get("/admin/subcatgroy/:id", AdminSubcaterites);
router.get("/admin/vendor_details/:id", VendorGetId);
router.get("/admin/dashboard", AdminDashboard);
router.get("/admin/payment_get", PaymentGet);
router.get("/admin/vendor/delete/:id", vendorDelete);
router.post("/admin/assign-staff", AssignStaff);


module.exports = router;