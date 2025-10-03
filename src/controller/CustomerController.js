const User = require("../model/User");
const Vendor = require("../model/Vendor");
const catchAsync = require("../utils/catchAsync");

exports.CustomerRegister = catchAsync(async (req, res) => {
    try {
        const {
            name,
            phone,
            email
        } = req.body;
        
        if (!name || !phone) {
            return errorResponse(res, "Name and phone are required", 400);
        }

        const Users = await User.findOne({ phone: phone });
        if (Users) {
            return errorResponse(res, "Phone number already exists", 400,);
        }
        const userdata = new User({ name, phone, role: "customer", email });
        const savedUser = await userdata.save();
        if (!savedUser) {
            return errorResponse(res, "Failed to create user", 500);
        }
        const token = jwt.sign(
            { id: savedUser._id, role: savedUser.role, email: savedUser.email },
            process.env.JWT_SECRET_KEY,
            { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
        );
        return successResponse(res, "User created successfully", 201, {
            user: savedUser,
            token: token,
            role: savedUser?.role,
        });
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.CustomerGet = catchAsync(async (req, res) => {
    try{
        const userId = req.user.id;
        const customer = await User.findById(userId);
        if (!customer) {
            return errorResponse(res, "No customers found", 404);
        }
        return successResponse(res, "Customers retrieved successfully", 200, customers);        
    }catch(error){
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.VendorGet = catchAsync(async (req, res) => {
    try{
        const vendors = await Vendor.find({}).populate("vendor");
        if (!vendors) {
            return errorResponse(res, "No vendors found", 404);
        }
        return successResponse(res, "Vendor retrieved successfully", 200, customers);        
    }catch(error){
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});