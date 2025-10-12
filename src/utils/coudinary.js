const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        console.log("file is uploaded on cloudinary ", response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath)
        console.log("Falied to upload file to cloudinary:", error.message);
    }
}

module.exports = uploadToCloudinary;