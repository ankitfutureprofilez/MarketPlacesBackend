const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    id: {
        type: Number,
        required: true
    },
    image: {
        type: String,
        default: null
    },
    deleted_at: {
        type: Date,
        default: null
    }
});

module.exports = mongoose.model("Category", categorySchema);
