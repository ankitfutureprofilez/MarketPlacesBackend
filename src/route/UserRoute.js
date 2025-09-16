const {  login, SendOtp, VerifyOtp, UserGet } = require("../controller/AuthController");

const UserRoute = require("express").Router();

// UserRoute.post("/register", signup);
UserRoute.post("/login", login);
UserRoute.get("/get-user", UserGet);
UserRoute.post("/send-otp",SendOtp);
UserRoute.post("/verify-otp", VerifyOtp);

module.exports =  UserRoute;