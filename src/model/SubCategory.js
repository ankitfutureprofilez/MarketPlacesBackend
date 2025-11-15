const mongoose = require("mongoose");

const subCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category"
  },
  deleted_at: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model("SubCategory", subCategorySchema);
