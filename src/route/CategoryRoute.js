const { category, subcategory } = require("../controller/CategoryController");

const categoryRoute  =  require("express").Router();

categoryRoute.post("categroy" , category);

categoryRoute.get("sub_categroy/:id" , subcategory);



module.exports =  categoryRoute ; 