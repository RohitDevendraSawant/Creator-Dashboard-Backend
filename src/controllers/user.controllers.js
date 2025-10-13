const asyncHandler = require("../utils/asyncHandler");

const User = require("../db/Schemas/user.model");

const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const uploadToCloudinary = require("../utils/cloudinary");
const { generateTokens } = require('../utils/helper');

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
    { username: 1, email: 1, password:1 }
    );

    if(!user){
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid) throw new ApiError(401, "UNAUOTHORIZED");

    const { accessToken, refreshToken } = await generateTokens(user._id);

    const options = {
        secure: true,
        httpOnly: true,
    }

    return res.status(200)
    .cookie('accessToken', accessToken, options)
    .cookie('refreshToken', refreshToken, options)
    .json(new ApiResponse(200, "success", { accessToken, refreshToken}));
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

module.exports = {
        registerUser,
        login,
        logout,
    }