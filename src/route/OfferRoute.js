const { verifyToken } = require("../controller/AuthController");
const { AddOffer, GetOfferId, OfferStatus, EditOffer ,GetOffer } = require("../controller/VendorController");

const OfferRoute = require("express").Router();

OfferRoute.post("/add", verifyToken ,  AddOffer);

OfferRoute.get("/get_details/:id", GetOfferId);

OfferRoute.get("/get", verifyToken ,  GetOffer);

OfferRoute.get("/status/:id/:status",  OfferStatus);

OfferRoute.post("/edit", EditOffer);


module.exports = OfferRoute;