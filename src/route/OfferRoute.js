const { AddOffer, GetOfferId, OfferStatus, EditOffer ,GetOffer, OfferDelete } = require("../controller/VendorController");
const { verifyToken } = require("../utils/tokenVerify");
const upload = require("../utils/uploader");

const router = require("express").Router();

router.post("/offer/add", verifyToken, upload.single("image"), AddOffer);
router.get("/offer/get_details/:id", GetOfferId);
router.post("/offer/offer_delete/:id", verifyToken, OfferDelete);
router.get("/offer/get", verifyToken ,  GetOffer);
router.get("/offer/status/:id/:status", verifyToken, OfferStatus);
router.post("/offer/update/:id", verifyToken, upload.single("image"), EditOffer);

module.exports = router;