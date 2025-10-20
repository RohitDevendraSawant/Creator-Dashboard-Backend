const { Router } = require('express');
const {
    registerUser,
    login,
    logout,
    refreshAccessToken,
    changePassword,
    changeAvatar,
    changeCoverImage,
    getUserProfile,
    getUserWatchHistory,
 } = require('../controllers/user.controllers');
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
router.route("/refreshToken").post(verifyToken, refreshAccessToken);
router.route("/user_profile").get(verifyToken, getUserProfile);
router.route("/changePassword").post(verifyToken, changePassword);
router.route("/changeavatar").post(upload.single("avatar"), verifyToken, changeAvatar);
router.route("/changecoverimage").post(upload.single("cover_image"), verifyToken, changeCoverImage);
router.route("/user_channel_details").get(verifyToken, getUserChannelDetails);
router.route("/user_watch_history").get(verifyToken, getUserWatchHistory);


module.exports = router;