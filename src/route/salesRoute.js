const { VendorGetAll, VendorStatus, VendorRegister, SalesGetId } = require("../controller/SalesController");

const salesroute =  require("express").Router();

salesroute.post("/vendor/:id" ,  VendorGetAll);

salesroute.post("/vendor_status" , VendorStatus);

salesroute.post("/vendor_add", VendorRegister );

salesroute.get("/sales_id/:id" ,  SalesGetId);

module.exports =  salesroute ; 