const asyncHandler = require("../utils/asyncHandler");

const User = require("../db/Schemas/user.model");

const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const uploadToCloudinary = require("../utils/cloudinary");

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
        new ApiResponse(200, createdUser, "User registered Successfully")
    );
})

module.exports = {
    registerUser,
}