const { verifyToken } = require("../controller/AuthController");
const { AddOffer, GetOfferId, OfferStatus, EditOffer ,GetOffer, OfferDelete } = require("../controller/VendorController");

const OfferRoute = require("express").Router();

OfferRoute.post("/add", verifyToken ,  AddOffer);

OfferRoute.get("/get_details/:id", GetOfferId);

OfferRoute.post("/offer_delete/:id", OfferDelete);

OfferRoute.get("/get", verifyToken ,  GetOffer);

OfferRoute.get("/status/:id/:status",  OfferStatus);

OfferRoute.post("/update/:id", EditOffer);



module.exports = OfferRoute;