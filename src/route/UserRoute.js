const { resetpassword } = require("../controller/AdminController");
const { SendOtp, UserGet, Login } = require("../controller/AuthController");

const router = require("express").Router();

router.get("/user/get-user", UserGet);
router.post("/user/send-otp",SendOtp);
router.post("/user/login", Login);
router.post("user/reset/password", resetpassword);

module.exports =  router;