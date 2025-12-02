const mongoose = require('mongoose')

const enquirySchema = mongoose.Schema({
    firstName: { type: String, require: [true, "Firstname is require"] },
    lastName: { type: String, require: [true, "Lastname is require"] },
    email: { type: String, require: [true, "Email is require"] },
    phone: { type: String, require: [true, "Phone is require"] },
    message: { type: String },
    role: { type: String, require: [true, "Role is require"] }
},
    { timestamps: true }
)

const Enquiry = mongoose.model('enquiry', enquirySchema);

module.exports = Enquiry;