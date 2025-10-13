const jwt = require('jsonwebtoken');
const User = require("../db/Schemas/user.model");
const ApiError = require("../utils/ApiError");

const verifyAuth = async (req, res, next) => {
    try{
        const accessToken = req.cookies?.accessToken || req.header('Authorization')?.replace("Bearer ", "");
        
        if(!accessToken) throw new ApiError(401, "Unauthorized request")

        const decodedToken  = await jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken._id).select({username: 1, email: 1}).lean();

        if (!user) {
            throw new ApiError(401, "Invalid Access Token")
        }

        req.user = user;
        return next();
    }catch(error){
        throw new ApiError(401, error?.message || "Invalid access token")
    }
}

module.exports = verifyAuth;