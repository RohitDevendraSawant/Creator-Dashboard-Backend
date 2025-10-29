const { Router } = require("express");
const verifyAuth = require("../middlewares/auth.middleware");
const {
  publishAVideo,
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus
} = require("../controllers/video.controller");
const upload = require("../middlewares/multer.middleware");

const router = Router();

// publish
router.post(
  "/publish",
  verifyAuth,
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 }
  ]),
  publishAVideo
);

// get paginated videos
router.get("/", getAllVideos);

// get single video
router.get("/:videoId", getVideoById);

// update video
router.patch(
  "/:videoId",
  verifyAuth,
  upload.fields([{ name: "thumbnail", maxCount: 1 }]),
  updateVideo
);

// delete video
router.delete("/:videoId", verifyAuth, deleteVideo);

// toggle publish
router.patch("/:videoId/publish", verifyAuth, togglePublishStatus);

module.exports = router;
