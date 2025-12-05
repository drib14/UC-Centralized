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
    params: async (req, file) => {
        let resource_type = 'image';
        if (file.mimetype.startsWith('audio') || file.mimetype.startsWith('video')) {
            resource_type = 'video';
        } else if (file.mimetype.startsWith('application')) {
            resource_type = 'raw';
        }

        return {
            folder: 'uc-central',
            resource_type: resource_type,
            // allow all formats by not specifying allowed_formats, or be very permissive
            public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "")}`
        };
    }
});

const parser = multer({ storage: storage });

module.exports = parser;
