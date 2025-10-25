const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    id:{
        type: Number,
        required: true
    },
    image:{
        type: String,
        // required: true
        default: "https://thumbs.dreamstime.com/b/cool-emoji-headphones-vector-cartoon-164269199.jpg"
    }
});

module.exports = mongoose.model("Category", categorySchema);
