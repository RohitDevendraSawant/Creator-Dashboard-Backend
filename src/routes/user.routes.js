const { Router } = require('express');
const { registerUser } = require('../controllers/user.controllers');
const upload = require("../middlewares/multer.middleware");


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

module.exports = router;