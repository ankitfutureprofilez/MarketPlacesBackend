const router = require("express").Router();
const { createEnquiry, getEnquiry, getEnquiryById } = require("../controller/EnquiryController.js")

router.post('/enquiry/create', createEnquiry)
router.get('/enquiry/getenquiry', getEnquiry)
router.get('/enquiry/getenquiry/:id', getEnquiryById)

module.exports = router