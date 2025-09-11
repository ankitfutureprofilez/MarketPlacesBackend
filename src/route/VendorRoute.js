const { VendorAdd, VendorGet, VendorGetId, vendorDelete, vendorUpdate, VendorStatus } = require("../controller/VendorController");

const VendorRoute = require("express").Router();

VendorRoute.post("/add", VendorAdd);

VendorRoute.get("/get", VendorGet);

VendorRoute.get("/get/:id", VendorGetId);

VendorRoute.post("/update/:id", vendorUpdate);

VendorRoute.post("/delete/:id", vendorDelete);

VendorRoute.post("/status/:id", VendorStatus);


module.exports = VendorRoute;