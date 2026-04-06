const mongoose = require('mongoose');

const credentialSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    credentialID: { type: String, required: true, index: true },
    publicKey: { type: String, required: true }, // WebAuthn Signing Key
    deviceName: { type: String },
    counter: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Credential', credentialSchema);
