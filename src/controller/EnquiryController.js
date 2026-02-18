const Enquiry = require('../model/enquiry.js');
const { options } = require('../route/AdminRoute.js');
const catchAsync = require("../utils/catchAsync");
const { errorResponse, successResponse } = require("../utils/ErrorHandling");

exports.createEnquiry = catchAsync(async (req, res) => {
    try {
        const { firstName, lastName, email, phone, message, role } = req.body;

        const isExist = await Enquiry.findOne({ phone: phone })
        if (isExist) {
            return errorResponse(res, "This enquiry is already exist");
        }

        if (!firstName || !lastName || !email || !phone || !message || !role) {
            return errorResponse(res, "Fields are required", 400);
        }

        const enquiry = new Enquiry({
            firstName,
            lastName,
            email,
            phone,
            message,
            role
        })
        const saveEnquiry = await enquiry.save();
        return successResponse(res, "Enquiry created successfully.", 201, saveEnquiry)
    } catch (error) {
        console.log(error)
        return errorResponse(res, "Internal server error", 500)
    }
})

exports.getEnquiry = catchAsync(async (req, res) => {
    try {
        const { search } = req.query;
        const filter = {};

        if (search) {
            filter.$or = [
                { firstName: { $regex: search.trim(), $options: "i" } },
                { lastName: { $regex: search.trim(), $options: "i" } }
            ]
        }
        const enquiries = await Enquiry.find(filter).lean();

        if (!enquiries.length) {
            return errorResponse(res, "No enquiries found.")
        }
        return successResponse(res, "All Enquiries fetched successfully", 200, enquiries)
    } catch (error) {
        console.log(error)
        return errorResponse(res, "Internal server error", 500)
    }
})

exports.getEnquiryById = catchAsync(async (req, res) => {
    try {
        const { id } = req.params.id;
        const enquiry = await Enquiry.findOne({ id });
        if (!enquiry) {
            errorResponse(res, "Failed to fetch enquiry")
        }
        successResponse(res, "Enquiry fetch successfully", 200, enquiry);
    } catch (error) {
        console.log(error)
        successResponse(res, "Internal server error", 500)
    }
})

