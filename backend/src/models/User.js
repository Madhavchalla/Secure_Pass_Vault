const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, index: true },
    encryptedProfileData: { type: String }, // Encrypted Name/Phone
    encryptionPublicKey: { type: String, required: true }, // RSA-OAEP Public Key for ZK
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
