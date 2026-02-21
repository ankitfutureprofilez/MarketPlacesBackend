const router = require("express").Router();
const { createEnquiry, getEnquiry, getEnquiryById } = require("../controller/EnquiryController.js")

router.post('/enquiry/create', createEnquiry)
router.get('/enquiry/get', getEnquiry)
router.get('/enquiry/get/:id', getEnquiryById)

module.exports = router