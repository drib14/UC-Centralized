const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'uc-central',
        resource_type: 'auto', // Auto-detect for audio/video support
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp3', 'webm', 'wav']
    }
});

const parser = multer({ storage: storage });

module.exports = parser;
