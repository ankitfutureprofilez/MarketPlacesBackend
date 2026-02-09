const { homeAdd, homefind, homeupdate } = require("../controller/HomeController");
const router = require("express").Router();

router.post("/home/add", homeAdd);
router.get("/home/find", homefind);
router.post("/home/update", homeupdate);

module.exports = router;