const Category = require("../model/categories");
const SubCategory = require("../model/SubCategory");
const Vendor = require("../model/Vendor");
const catchAsync = require("../utils/catchAsync");
const { errorResponse, successResponse, validationErrorResponse } = require("../utils/ErrorHandling");
const deleteUploadedFiles = require("../utils/fileDeleter");

async function generateNextId() {
    const lastCategory = await Category.findOne().sort({ id: -1 });
    return lastCategory ? lastCategory.id + 1 : 1;
}

async function generateSubCategoryNextId(categoryid) {
    categoryid = categoryid;
    const lastSub = await SubCategory.findOne({ categoryid })
        .sort({ subcategory_id: -1 });

    if (lastSub) {
        return lastSub.subcategory_id + 1;
    }
    return categoryid * 1000 + 1;
}



exports.addCategory = catchAsync(async (req, res) => {
    try {
        const { name } = req.body;
        const id = await generateNextId();
        let image = null;
        if (req.file && req.file.filename) {
            image = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
        }
        const category = new Category({
            name,
            image: image,
            id
        });
        await category.save();
        return successResponse(res, "Category added", 201, category);

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});


exports.getCategories = catchAsync(async (req, res) => {
    try {
        const categories = await Category.find().sort({ id: 1 });
        return successResponse(res, "Category show", 201, categories);

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);

    }
});

exports.getCategoryById = catchAsync(async (req, res) => {
    try {
        const category = await Category.findOne({ id: req.params.id });
        if (!category) {
            return errorResponse(res, "Category not found", 404);
        }
        return successResponse(res, "Category Id", 201, category);

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);

    }
});

exports.updateCategory = async (req, res) => {
    try {
        const id = req.params.id;
        console.log("id", id)
        const { name } = req.body;
        const category = await Category.findById(id);
        console.log("category", category)
        if (!category || category.deleted_at) {
            return validationErrorResponse(res, "Category not found", 404);
        }
        if (name) category.name = name;
        if (req.file && req.file.filename) {
            if (category.image) {
                try {
                    await deleteUploadedFiles([category.image]);
                } catch (err) {
                    console.log("Failed to delete old image:", err.message);
                }
            }

            const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
            category.image = fileUrl;
        }

        const updatedCategory = await category.save();

        return successResponse(res, "Category updated successfully", 200, updatedCategory);

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
};


exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findById(id);
        if (!category) {
            return validationErrorResponse(res, "Category not found.", 404);
        }
        if (category.deleted_at) {
            category.deleted_at = null;
            await category.save();
            return successResponse(res, "Category restored successfully.", 200);
        }
        category.deleted_at = new Date();
        await category.save();

        return successResponse(res, "Category deleted successfully.", 200);

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
};



exports.getSubCategories = catchAsync(async (req, res) => {
    try {
        const categories = await SubCategory.find()
            .populate("category_id") // 👈 this joins with Category table
            .sort({ subcategory_id: 1 });

        return successResponse(res, "Subcategories loaded", 200, categories);

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});


exports.addSubCategory = catchAsync(async (req, res) => {
    try {
        const { name, category_id } = req.body;
        console.log("Body:", req.body);
        const subcategory = new SubCategory({
            name,
            category_id: category_id,
        });
        await subcategory.save();
        return successResponse(res, "subcategory added", 201, subcategory);

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});


exports.deleteSubCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await SubCategory.findById(id);
        if (!category) {
            return validationErrorResponse(res, "SubCategory not found.", 404);
        }
        if (category.deleted_at) {
            category.deleted_at = null;
            await category.save();
            return successResponse(res, "SubCategory restored successfully.", 200);
        }
        category.deleted_at = new Date();
        await category.save();

        return successResponse(res, "SubCategory deleted successfully.", 200);

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
};


exports.updateSubCategory = async (req, res) => {
    try {
        const id = req.params.id;
        console.log("id", id)
        const { name , category_id } = req.body;
        const category = await SubCategory.findById(id);
        console.log("category", category)
        if (!category || category.deleted_at) {
            return validationErrorResponse(res, "Category not found", 404);
        }
        if (name) category.name = name;
        if (category_id) category.category_id = category_id;

        const updatedCategory = await category.save();

        return successResponse(res, "Category updated successfully", 200, updatedCategory);

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
};


