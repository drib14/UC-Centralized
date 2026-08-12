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
        } else if (file.mimetype.startsWith('application') || file.mimetype === 'application/pdf') {
            resource_type = 'raw';
        }

        // Clean filename to prevent path traversal or invalid characters
        const safeOriginalName = (file.originalname || 'upload')
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .substring(0, 50);

        return {
            folder: 'uc-central',
            resource_type: resource_type,
            public_id: `${Date.now()}-${safeOriginalName}`
        };
    }
});

const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'application/pdf'
];

const parser = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB maximum file size limit
    },
    fileFilter: (req, file, cb) => {
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed types: JPEG, PNG, WEBP, GIF, MP4, WEBM, MP3, WAV, PDF`));
        }
    }
});

module.exports = parser;
