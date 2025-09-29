const { VendorGetAll, VendorStatus, VendorRegister, SalesGetId, AddSalesPersons } = require("../controller/SalesController");

const salesroute =  require("express").Router();

salesroute.post("/vendor/:id" ,  VendorGetAll);

salesroute.post("/vendor_status" , VendorStatus);

salesroute.post("/vendor_add", VendorRegister );

salesroute.get("/sales_id/:id" ,  SalesGetId);

salesroute.post("/sales_add" ,  AddSalesPersons);


module.exports =  salesroute ; 