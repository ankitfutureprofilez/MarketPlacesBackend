const express = require("express");
const router = express.Router();
const categoryController = require("../controller/CategoryController");
const upload = require("../utils/uploader");
// CRUD Routes
router.post("/category/add",upload.single("image"), categoryController.addCategory);
router.get("/category/all", categoryController.getCategories);
router.get("/category/:id", categoryController.getCategoryById);
router.post("/category/update/:id",upload.single("image"), categoryController.updateCategory);
router.post("/category/delete/:id", categoryController.deleteCategory);
router.post("/subcategory/delete/:id", categoryController.deleteSubCategory);



router.get("/subcategory/all", categoryController.getSubCategories);


router.post("/subcategory/add", categoryController.addSubCategory);


router.post("/subcategory/update/:id", categoryController.updateSubCategory);




module.exports = router;
