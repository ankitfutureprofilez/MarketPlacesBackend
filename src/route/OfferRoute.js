const { AddOffer, GetOfferId, OfferStatus, EditOffer ,GetOffer, OfferDelete } = require("../controller/VendorController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.post("/add", verifyToken ,  AddOffer);

router.get("/get_details/:id", GetOfferId);

router.post("/offer_delete/:id", OfferDelete);

router.get("/get", verifyToken ,  GetOffer);

router.get("/status/:id/:status",  OfferStatus);

router.post("/update/:id", EditOffer);



module.exports = router;