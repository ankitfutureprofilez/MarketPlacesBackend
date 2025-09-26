const { SendOtp, UserGet, Login } = require("../controller/AuthController");

const router = require("express").Router();

// UserRoute.post("/register", signup);
router.get("/get-user", UserGet);
router.post("/send-otp",SendOtp);
// Verify otp and login if account exists
router.post("/login", Login);

module.exports =  router;