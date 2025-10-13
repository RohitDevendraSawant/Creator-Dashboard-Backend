const ApiError = require("../utils/ApiError");
const User = require("../db/Schemas/user.model");

// Helper method to generate access & refresh tokens
const generateTokens = async (userId) => {
    try{
        const user = await User.findById(userId).select({email:1}).lean();

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        await User.updateOne({email: user.email}, {$set: {refreshToken}});

        return { accessToken, refreshToken};
    }catch(error){
        throw new ApiError(500, `Issue in generating tokens, ${error}`);
    }
}