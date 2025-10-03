const { AddOffer, GetOfferId, OfferStatus, EditOffer ,GetOffer, OfferDelete } = require("../controller/VendorController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.post("/offer/add", verifyToken ,  AddOffer);
router.get("/offer/get_details/:id", GetOfferId);
router.post("/offer/offer_delete/:id", OfferDelete);
router.get("/offer/get", verifyToken ,  GetOffer);
router.get("/offer/status/:id/:status",  OfferStatus);
router.post("/offer/update/:id", EditOffer);

module.exports = router;