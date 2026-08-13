const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
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
        let resource_type = 'raw';
        const mime = (file.mimetype || '').toLowerCase();
        const ext = path.extname(file.originalname || '').toLowerCase();
        const rawExt = ext.replace(/^\./, '');
        
        const isImage = mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'heic', 'tiff'].includes(rawExt);
        const isVideo = (mime.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v', '3gp', 'ogv'].includes(rawExt)) && !mime.startsWith('audio/');

        if (isImage) {
            resource_type = 'image';
        } else if (isVideo) {
            resource_type = 'video';
        } else {
            // Audio files, PDFs, documents, spreadsheets, presentations, code, archives, etc.
            resource_type = 'raw';
        }

        const baseName = path.basename(file.originalname || 'file', ext)
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .substring(0, 40) || 'file';

        // For raw files (audio, pdf, documents, zips, code, etc.), include the extension in public_id so Cloudinary preserves the file type when accessed/downloaded
        const publicId = resource_type === 'raw' 
            ? `${Date.now()}-${baseName}${ext || ''}`
            : `${Date.now()}-${baseName}`;

        return {
            folder: 'uc-central',
            resource_type: resource_type,
            public_id: publicId
        };
    }
});

const parser = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50 MB maximum file size limit
    },
    fileFilter: (req, file, cb) => {
        // Accept all file types
        cb(null, true);
    }
});

module.exports = parser;
