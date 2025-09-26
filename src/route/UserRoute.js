const { SendOtp, UserGet, Login } = require("../controller/AuthController");

const router = require("express").Router();

// UserRoute.post("/register", signup);
router.get("/user/get-user", UserGet);
router.post("/user/send-otp",SendOtp);
// Verify otp and login if account exists
router.post("/user/login", Login);

module.exports =  router;