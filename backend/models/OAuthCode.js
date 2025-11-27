const mongoose = require('mongoose');

const oAuthCodeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    clientId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    redirectUri: { type: String, required: true },
    expiresAt: { type: Date, required: true }
}, { timestamps: true });

// Auto-expire
oAuthCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OAuthCode', oAuthCodeSchema);
