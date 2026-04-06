const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true }, // 'LOGIN_SUCCESS', 'DOC_VIEW', 'DOC_UPLOAD'
    timestamp: { type: Date, default: Date.now },
    deviceInfo: { type: String },
    ipHash: { type: String } // Hashed IP for privacy compliance
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
