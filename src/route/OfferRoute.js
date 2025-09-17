const { AddOffer, GetOfferId, OfferStatus, EditOffer ,GetOffer } = require("../controller/VendorController");

const OfferRoute = require("express").Router();

OfferRoute.post("/add/:id", AddOffer);

OfferRoute.get("/get_details/:id", GetOfferId);

OfferRoute.get("/get/:id", GetOffer);

OfferRoute.get("/status/:id", OfferStatus);

OfferRoute.post("/edit", EditOffer);


module.exports = OfferRoute;