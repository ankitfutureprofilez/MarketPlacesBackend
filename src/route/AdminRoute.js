const {  VendorGet, SalesGet, UserGet } = require("../controller/AdminController");

const OfferRoute = require("express").Router();

OfferRoute.post("/vendor_list", VendorGet);

OfferRoute.get("/sales_list", SalesGet);

OfferRoute.get("/user_list", UserGet);

module.exports = OfferRoute;