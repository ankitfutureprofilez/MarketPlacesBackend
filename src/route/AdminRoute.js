const router = require("express").Router();
const { AdminVendorGet, SalesGet, UserGet, Login, adminGet, VendorRegister, VendorGetId, AdminDashboard, PaymentGet, vendorUpdate, AssignStaff, AddSalesPersons, EditSalesPerson, DeleteUser, EditAdmin, resetpassword, SalesList, SalesAdminGetId, BroughtOffers, AdminGetCategories, AdminSalesStats, CustomerGetId, addVendorGallery, deleteVendorGallery, AddSubAdmin, UpdateSubAdmin, SubAdminGet, AdminGetOfferId, AdminEditOffer } = require("../controller/AdminController");
const { VendorStatus, AdminSubcaterites } = require("../controller/VendorController");
const { verifyToken } = require("../utils/tokenVerify");
const upload = require("../utils/uploader");

router.post("/admin/login", Login);
router.get("/admin/vendor_list", verifyToken, AdminVendorGet);
router.get("/admin/sales_list", verifyToken, SalesGet);
// Niche waala route vendor ko assign ke team call hota hai. Done due to lack of time and urgency, future mein shai karna hai.
router.get("/admin/sales-get", verifyToken, SalesList);
router.get("/admin/user_list", verifyToken, UserGet);
router.get("/admin/user/:id", verifyToken, CustomerGetId);
router.get("/admin/vendor_status/:id/:status", verifyToken, VendorStatus);
// router.get("/admin/sales_status/:id/:status", verifyToken, SalesPersonStatus);
router.post("/admin/sales_add", verifyToken, upload.single("avatar"), verifyToken, AddSalesPersons);
router.post("/admin/sales/edit/:id", verifyToken, upload.single("avatar"), EditSalesPerson);
router.post("/admin/sales/delete/:id", verifyToken, DeleteUser);
router.get("/admin/profile-token", verifyToken, adminGet);
router.post("/admin/vendor-add", verifyToken,
    upload.fields([
        { name: "aadhaar_front", maxCount: 1 },
        { name: "aadhaar_back", maxCount: 1 },
        { name: "pan_card_image", maxCount: 1 },
        { name: "gst_certificate", maxCount: 1 },
        { name: "business_logo", maxCount: 1 },
    ]), VendorRegister);
router.post("/admin/vendor-Edit/:id", verifyToken,
    upload.fields([
        { name: "aadhaar_front", maxCount: 1 },
        { name: "aadhaar_back", maxCount: 1 },
        { name: "pan_card_image", maxCount: 1 },
        { name: "gst_certificate", maxCount: 1 },
        { name: "business_logo", maxCount: 1 },
    ]), vendorUpdate);
router.post("/admin/vendor/gallery/upload/:id", verifyToken, upload.array("files", 10), addVendorGallery);
router.post("/admin/vendor/gallery/delete/:id", verifyToken, deleteVendorGallery);

router.get("/admin/subcatgroy/:id", AdminSubcaterites);
router.get("/admin/vendor_details/:id", VendorGetId);

router.get("/admin/offer/:id",verifyToken, AdminGetOfferId);
router.post("/admin/offer/update/:id", verifyToken, upload.single("image"), AdminEditOffer);

router.get("/admin/dashboard", AdminDashboard);
router.get("/admin/dashboard/sales", AdminSalesStats);
router.get("/admin/payment_get", PaymentGet);
router.post("/admin/assign-staff", AssignStaff);
router.post("/admin/edit", verifyToken, upload.single("avatar"), EditAdmin);
router.post("/admin/reset/password", resetpassword);
router.get("/admin/sales_id/:id", SalesAdminGetId);
router.get("/admin/brought-offer",verifyToken, BroughtOffers);
router.get("/admin/category/get", AdminGetCategories);

// Sub-admin routes
router.post("/admin/sub-admin/add", verifyToken, upload.single("avatar"), verifyToken, AddSubAdmin);
router.post("/admin/sub-admin/update/:id", verifyToken, upload.single("avatar"), verifyToken, UpdateSubAdmin);
router.get("/admin/sub-admin/get", verifyToken, SubAdminGet);

module.exports = router;