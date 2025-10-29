const mongoose = require("mongoose");
const { isValidObjectId } = mongoose;

const Video = require("../db/Schemas/video.model");
const User = require("../db/Schemas/user.model");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const uploadToCloudinary = require("../utils/cloudinary");
const asyncHandler = require("../utils/asyncHandler");



const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query = "",
        sortBy = "createdAt",
        sortType = "desc",
        userId
    } = req.query;

    const match = {};

    if (query) {
        match.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
        ];
    }

    if (userId && isValidObjectId(userId)) {
        match.owner = new mongoose.Types.ObjectId(userId);
    }

    match.isPublished = true;

    const aggregate = Video.aggregate([
        { $match: match },
        {
            $sort: {
                [sortBy]: sortType === "desc" ? -1 : 1
            }
        }
    ]);

    const options = {
        page: +page,
        limit: +limit,
        customLabels: {
            docs: "videos"
        }
    };

    const result = await Video.aggregatePaginate(aggregate, options);

    return res
        .status(200)
        .json(new ApiResponse(200, "Videos fetched", result));
});


const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body

    const videoFilePath = req.files?.video?.[0]?.path;
    const thumbnailFilePath = req.files?.thumbnail?.[0]?.path;

    if (!videoFilePath || !thumbnailFilePath) {
        throw new ApiError(400, "Video & thumbbnail file is required to publish a video");
    }

    const video = await uploadToCloudinary(videoFilePath);
    const thumbnail = await uploadToCloudinary(thumbnailFilePath);

    if (!video) return new ApiResponse(500, "Failed to upload video on cloud");
    if (!thumbnail) return new ApiResponse(500, "Failed to upload thumbnail on cloud");

    const newVideo = await Video.create({
        videoFile: video.url,
        thumbnail: thumbnail.url,
        title,
        description,
        duration: video.duration || 0,
        owner: req.user._id
    });

    return res.status(201).json(new ApiResponse(201, "Video published successfully", newVideo));
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        { $inc: { views: 1 } },
        { new: true }
    ).populate("owner", "username avatar");

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, "Video fetched", video));
});


const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized");
    }

    let thumbnailUrl = video.thumbnail;
    const thumbnailFilePath = req.files?.thumbnail?.[0]?.path;

    if (thumbnailFilePath) {
        const thumbnailUpload = await uploadToCloudinary(thumbnailFilePath);
        thumbnailUrl = thumbnailUpload.url;
    }

    video.title = title || video.title;
    video.description = description || video.description;
    video.thumbnail = thumbnailUrl;

    await video.save();

    return res
        .status(200)
        .json(new ApiResponse(200, "Video updated", video));
});


const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized");
    }

    await video.deleteOne();

    return res
        .status(200)
        .json(new ApiResponse(200, "Video deleted"));
});


const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized");
    }

    video.isPublished = !video.isPublished;
    await video.save();

    return res
        .status(200)
        .json(new ApiResponse(200, "Publish status updated", video));
});


module.exports = {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}