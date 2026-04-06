const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    category: { type: String, required: true }, // e.g., 'IDENTITY', 'FINANCIAL'
    encryptedFile: { type: String, required: true }, // Base64 or GridFS reference
    encryptedAESKey: { type: String, required: true }, // Ciphertext of the AES key
    encryptedMetadata: { type: String, required: true }, // JSON ciphertext of name, etc.
    fileHash: { type: String }, // For integrity checks (HMAC)
    uploadDate: { type: Date, default: Date.now },
    expiryDate: { type: Date }
});

module.exports = mongoose.model('Document', documentSchema);
