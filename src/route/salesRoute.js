const { verifyToken } = require("../controller/AuthController");
const { VendorGetAll, VendorStatus, VendorRegister, SalesGetId, AddSalesPersons } = require("../controller/SalesController");

const router = require("express").Router();

router.post("/vendor/:id", VendorGetAll);

router.post("/vendor_status", VendorStatus);

router.post("/vendor_add", verifyToken, VendorRegister);

router.get("/sales_id/:id", SalesGetId);

module.exports = router; 