const { VendorGet, VendorGetId, vendorDelete, vendorUpdate, VendorStatus, VendorRegister, category, subcategory } = require("../controller/VendorController");

const VendorRoute = require("express").Router();

VendorRoute.post("/register", VendorRegister);

VendorRoute.get("/get", VendorGet);

VendorRoute.get("/get_details/:id", VendorGetId);

VendorRoute.post("/update/:id", vendorUpdate);

VendorRoute.post("/delete/:id", vendorDelete);

VendorRoute.post("/status", VendorStatus);

VendorRoute.get("/categroy", category);

VendorRoute.get("/sub_categroy/:id", subcategory);

module.exports = VendorRoute;