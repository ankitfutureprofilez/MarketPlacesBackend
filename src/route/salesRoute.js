const { VendorGetAll, VendorStatus, VendorRegister, SalesGetId, AddSalesPersons } = require("../controller/SalesController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.post("/sales/vendor/:id", VendorGetAll);
router.post("/sales/vendor_status", VendorStatus);
router.post("/sales/vendor_add", verifyToken, VendorRegister);
router.get("/sales/sales_id/:id", SalesGetId);

module.exports = router; 
