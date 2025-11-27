const mongoose = require('mongoose');

const oAuthAppSchema = new mongoose.Schema({
    name: { type: String, required: true },
    clientId: { type: String, required: true, unique: true },
    clientSecret: { type: String, required: true },
    redirectUris: [{ type: String, required: true }],
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('OAuthApp', oAuthAppSchema);
