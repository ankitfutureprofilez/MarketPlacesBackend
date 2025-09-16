const mongoose = require("mongoose");

const subCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  category_id: {
    type: Number,
    required: true
  },
  subcategory_id: {
    type: Number,
  }
});

module.exports = mongoose.model("SubCategory", subCategorySchema);
