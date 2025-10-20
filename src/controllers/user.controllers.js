const asyncHandler = require("../utils/asyncHandler");

const User = require("../db/Schemas/user.model");

const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const uploadToCloudinary = require("../utils/cloudinary");
const { generateTokens } = require('../utils/helper');

const jwt = require("jsonwebtoken");
const { default: mongoose } = require("mongoose");

/*
Controller to handle user registration.
Accept username, email, fullName, password from req body.
Validate all the fields are non empty.
Check if user already exist with perticular mail and username.
Check if avatar and cover image are present at local path.
Upload images to coudinary and verify the upload.
Add user details in database.
Return the response by removing hashed password and refresh token.
*/
const registerUser = asyncHandler(async (req, res) => {
    const { username, email, fullName, password } = req.body;

    if ([username, email, fullName, password].some((field) => field?.trim()?.length === 0)) {
        throw new ApiError(400, "Please enter all the required fields.");
    }

    const isUserExist = await User.findOne({
        $or: [
            { email },
            { username },
        ]
    }, { email: 1, username: 1 }).lean();

    if (isUserExist) {
        throw new ApiError(409, "User already exists.");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.cover_image[0]?.path;

    if (!avatarLocalPath || !coverImageLocalPath) throw new ApiError(400, "Avatar file is required");


    const avatar = await uploadToCloudinary(avatarLocalPath)
    const coverImage = await uploadToCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullName,
        avatar,
        coverImage,
        password,
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    ).lean();

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered Successfully")
    );
});

/*
Controller for user login.
Destructure username/email, password from req body and validate non empty data.
Validate if user exists with username/email.
Verify user password.
Generate access and refresh token.
Store refresh token in users document.
Store tokens in cookies and send them as response as well.
*/

const login = asyncHandler(async (req, res) => {
    const { username = null, email = null, password } = req.body;

    if (!username && !email) {
        throw new ApiError(400, "Provide email or username");
    }

    if (!password) {
        throw new ApiError(401, "Invalid credentials");
    }

    const user = await User.findOne({
        $or: [
            { username }, { email }
        ]
    },
        { username: 1, email: 1, password: 1 }
    );

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) throw new ApiError(401, "UNAUOTHORIZED");

    const { accessToken, refreshToken } = await generateTokens(user._id);

    const options = {
        secure: true,
        httpOnly: true,
    }

    return res.status(200)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', refreshToken, options)
        .json(new ApiResponse(200, "success", { accessToken, refreshToken }));
});

/*
Controller to logout user.
Fetch userId(_id) from req and check if user exist.
Unset the refresh token from users document.
Remove the cookies and logout the user.
*/
const logout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1,
            }
        },
    );

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200).
        clearCookie("accessToken", options).
        clearCookie("refreshToken", options).
        json(new ApiResponse(200, "User logout."));
});

/* Conroller to refresh access token using refresh token.
Accept refresh token from req cookies or req header.
Validate if refresh token is present.
Check if user exist with the refresh token.
Generate new access and refresh tokens.
Update the new refresh token in users document.
Set the tokens in cookies and return as response as well.
*/
const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingToken = req.cookies?.refreshToken || req.header('Authoriation')?.replace("Bearer ", "");

        if (!incomingToken) throw new ApiError(401, "Unauthorized request");

        const decodedToken = await jwt.verify(incomingToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findOne({ _id: decodedToken._id }).select({ username: 1, email: 1, refreshToken: 1 });

        if (!user) throw new ApiError(401, "Invalid refresh token");

        if (user.refreshToken !== incomingToken) throw new ApiError(401, "Invalid refresh token");

        const { accessToken, refreshToken } = await generateTokens(user._id);

        const options = {
            secure: true,
            httpOnly: true,
        }

        return res.status(200)
            .cookie('accessToken', accessToken, options)
            .cookie('refreshToken', refreshToken, options)
            .json(new ApiResponse(200, "success", { accessToken, refreshToken }, "Tokens refreshed successfully"));
    } catch (error) {
        throw new ApiError(500, "Something went wrong while refreshing access token", error);
    }
});

/*
Controller tp get user profile.
Fetch userId from req and get user details from db.
Return the user details after removing password and refresh token.
*/
const getUserProfile = asyncHandler(async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password -refreshToken").lean();
        return res.status(200).json(new ApiResponse(200, user, "User profile fetched successfully"));
    } catch (error) {
        throw new ApiError(500, "Something went wrong while fetching user profile", error);
    }
});

/*
Controller to change user password.
Fetch oldPassword and newPassword from req body.
Validate non empty passwords.
Fetch userId from req and get user details from db.
Validate old password.
Update new password and save the user document.
Return success response.
*/
const changePassword = asyncHandler(async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            throw new ApiError(400, "Please provide both old and new passwords.");
        }

        const user = await User.findById(req.user._id).select({ password: 1 });

        const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

        if (!isPasswordCorrect) throw new ApiError(401, "Old password is incorrect");

        user.password = newPassword;
        await user.save();

        return res.status(200).json(new ApiResponse(200, "Password changed successfully."));
    } catch (error) {
        throw new ApiError(500, "Something went wrong while changing password", error);
    }
});

/*
Controller to change user avatar.
Fetch avatar file from req.
Validate if avatar file is present.
Upload avatar to cloudinary and verify the upload.
Fetch userId from req and update the avatar in users document.
Return success response.
*/
const changeAvatar = asyncHandler(async (req, res) => {
    try {
        const avatarLocalPath = req.file?.path;
        if (!avatarLocalPath) throw new ApiError(400, "Avatar file is required");

        const avatar = await uploadToCloudinary(avatarLocalPath)
        if (!avatar) {
            throw new ApiError(400, "Avatar file is required")
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { avatar },
            { new: true }
        ).select("-password -refreshToken").lean();

        return res.status(200).json(new ApiResponse(200, "Avatar updated successfully"));
    } catch (error) {
        throw new ApiError(500, "Something went wrong while updating avatar", error);
    }
});

/*Controller to change user cover image.
Fetch cover image file from req.
Validate if cover image file is present.
Upload cover image to cloudinary and verify the upload.
Fetch userId from req and update the cover image in users document.
Return success response.
*/
const changeCoverImage = asyncHandler(async (req, res) => {
    try {
        const coverImageLocalFile = req.file?.path;
        if (!coverImageLocalFile) throw new ApiError(400, "Avatar file is required");

        const coverImage = await uploadToCloudinary(coverImageLocalFile)
        if (!coverImage) {
            throw new ApiError(400, "CoverImage file is required")
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { coverImage },
            { new: true }
        ).select("-password -refreshToken").lean();

        return res.status(200).json(new ApiResponse(200, "CoverImage updated successfully"));
    } catch (error) {
        throw new ApiError(500, "Something went wrong while updating cover image", error);
    }
});

/*Controller to get user subscription details.
Fetch userId from req and get user details from db.
Return the user details after removing password and refresh token.
*/

const getUserChannelDetails = asyncHandler(async (req, res) => {
    try {
        const username = req.params?.username?.toLowerCase();

        if(!username.trim()?.length){
            throw new ApiError(400, "Invalid username");
        }
        
        const channelDetails = await User.aggregate([
            {
                $match: { username }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "creator",
                    as: "subscribers",
                }
            },
            {
                $addFields: {
                    totalSubscribers: { $size: "$subscribers" },
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedTo",
                }
            },
            {
                $addFields: {
                    channelSubscribedToCount: { $size: "$subscribedTo" },
                    isSubscribedToChannel: {
                        $cond: {
                            if: { $in: [req.user._id, "$subscribers.subscriber"] }
                            , then: true, else: false
                        }
                    },
                }
            },
            {
                $project: {
                    fullName: 1,
                    username: 1,
                    subscribersCount: 1,
                    channelsSubscribedToCount: 1,
                    isSubscribed: 1,
                    avatar: 1,
                    coverImage: 1,
                    email: 1
                }
            }
        ]);

        if (!channelDetails?.length) {
            throw new ApiError(404, "channel does not exists")
        }

        return res
            .status(200)
            .json(new ApiResponse(200, channelDetails[0], "User channel fetched successfully"));
    } catch (error) {
        throw new ApiError(500, "Something went wrong while fetching subscription details", error);
    }
});

const getUserWatchHistory = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;

        const user = await User.aggregate([
            {
                $match: {_id: mongoose.Types.ObjectId(userId) },
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "watchHistory",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "ownerDetails",
                                pipeline: [
                                    { $project: { fullName: 1, username: 1, avatar: 1 } }
                                ]
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    owner: {
                        $first: "$ownerDetails" 
                    }
                }
            }

        ]);

        return res.status(200).json(new ApiResponse(200, user[0].watchHistory, "User watch history fetched successfully"));
    } catch (error) {
        throw new ApiError(500, "Something went wrong while fetching watch history", error);
    }
});

module.exports = {
    registerUser,
    login,
    logout,
    refreshAccessToken,
    getUserProfile,
    changePassword,
    changeAvatar,
    changeCoverImage,
    getUserChannelDetails,
    getUserWatchHistory,
}