const { VendorAdd, VendorGet, VendorGetId, vendorDelete, vendorUpdate } = require("../controller/VendorController");

const vendorrouter = require("express").Router();

vendorrouter.post("/add", VendorAdd);

vendorrouter.get("/get", VendorGet);

vendorrouter.get("/get/:id", VendorGetId);

vendorrouter.post("/update/:id", vendorUpdate);

vendorrouter.post("/delete/:id", vendorDelete);


module.exports = vendorrouter;