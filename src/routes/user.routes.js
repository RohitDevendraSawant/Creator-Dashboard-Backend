const { Router } = require('express');
const { registerUser, login, logout } = require('../controllers/user.controllers');
const upload = require("../middlewares/multer.middleware");
const verifyToken = require("../middlewares/auth.middleware");

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "cover_image",
            maxCount: 1
        },
    ]),
    registerUser
);

router.route("/login").post(login);
router.route("/logout").post(verifyToken, logout);

module.exports = router;