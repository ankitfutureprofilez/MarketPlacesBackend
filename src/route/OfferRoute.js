const { AddOffer, GetOfferId, OfferStatus, EditOffer } = require("../controller/VendorController");

const OfferRoute = require("express").Router();

OfferRoute.post("/add", AddOffer);

OfferRoute.get("/get/:id", GetOfferId);

OfferRoute.get("/status/:id", OfferStatus);

OfferRoute.post("/edit", EditOffer);


module.exports = OfferRoute;