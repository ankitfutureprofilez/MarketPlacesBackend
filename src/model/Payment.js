const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    order_id: {
        type: String,
        required: true,
    },
    payment_id: {
        type: String,
    },
    amount: {
        type: Number,
    },
    currency: {
        type: String,
        default: "INR"
    },
    payment_status: {
        type: String,
        default: 'pending',
    },
    payment_method: {
        type: String
    },
    Offer_id: {
        type: String,
    },
    event: String,

    payment_date: {
        type: Date,
        default: Date.now,
    },
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;