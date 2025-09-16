const {  VendorGet, VendorGetId, vendorDelete, vendorUpdate, VendorStatus, VendorRegister } = require("../controller/VendorController");

const VendorRoute = require("express").Router();

VendorRoute.post("/register", VendorRegister);

VendorRoute.get("/get", VendorGet);

VendorRoute.get("/get/:id", VendorGetId);

VendorRoute.post("/update/:id", vendorUpdate);

VendorRoute.post("/delete/:id", vendorDelete);

VendorRoute.post("/status/:id", VendorStatus);


module.exports = VendorRoute;