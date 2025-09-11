const { AddOffer, GetOfferId, OfferStatus } = require("../controller/AddOfferController");

const OfferRoute = require("express").Router();

OfferRoute.post("/add", AddOffer);


OfferRoute.get("/get/:id", GetOfferId);


OfferRoute.post("/status/:id", OfferStatus);

module.exports = OfferRoute;