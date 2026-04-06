const mongoose = require('mongoose');
const Document = require('../models/Document');
const User = require('../models/User');

// In-memory fallback if no DB
const MOCK_DOCUMENTS = [];
const MOCK_USERS = []; // Assuming authController and documentController might share this in a real mock setup, but for now we just use email directly

exports.uploadDocument = async (req, res) => {
    try {
        const { email, category, fileName, encryptedFile, encryptedAESKey } = req.body;

        if (!email || !encryptedFile || !encryptedAESKey) {
            return res.status(400).json({ error: 'Missing required encryption payload' });
        }

        const documentData = {
            category,
            encryptedFile,
            encryptedAESKey,
            encryptedMetadata: Buffer.from(fileName).toString('base64'), // Simple mock metadata encryption
            uploadDate: new Date()
        };

        if (mongoose.connection.readyState === 1) {
            let user = await User.findOne({ email });
            if (!user) return res.status(404).json({ error: 'User not found' });

            documentData.userId = user._id;
            await Document.create(documentData);
        } else {
            console.log("No MongoDB - Saving Encrypted Document to Memory");
            documentData.id = Date.now().toString();
            documentData.userEmail = email; // Map via email for mock
            MOCK_DOCUMENTS.push(documentData);
        }

        res.status(201).json({ message: 'Document uploaded securely' });

    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getDocuments = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ error: 'Email required' });

        let documents = [];

        if (mongoose.connection.readyState === 1) {
            const user = await User.findOne({ email });
            if (!user) return res.status(404).json({ error: 'User not found' });

            documents = await Document.find({ userId: user._id }).sort({ uploadDate: -1 });
        } else {
            documents = MOCK_DOCUMENTS.filter(doc => doc.userEmail === email).sort((a, b) => b.uploadDate - a.uploadDate);
        }

        // We do NOT send the AES keys down in the list view, only when viewing a specific document
        // But for simplicity in this iteration, we just return the metadata list
        const safeList = documents.map(doc => ({
            id: doc._id || doc.id,
            category: doc.category,
            uploadDate: doc.uploadDate,
            fileName: Buffer.from(doc.encryptedMetadata, 'base64').toString('ascii') // Note: In truly ZK, the filename is decrypted on client
        }));

        res.json({ documents: safeList });

    } catch (error) {
        console.error('Get Documents Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.query;

        if (!email || !id) return res.status(400).json({ error: 'Email and ID required' });

        let document;

        if (mongoose.connection.readyState === 1) {
            const user = await User.findOne({ email });
            if (!user) return res.status(404).json({ error: 'User not found' });

            document = await Document.findOne({ _id: id, userId: user._id });
        } else {
            document = MOCK_DOCUMENTS.find(doc => doc.id === id && doc.userEmail === email);
        }

        if (!document) return res.status(404).json({ error: 'Document not found or unauthorized' });

        // IMPORTANT: We only return the AES encrypted string and IV. The server DOES NOT have the private key to decrypt this.
        res.json({
            id: document._id || document.id,
            encryptedFile: document.encryptedFile,
            encryptedAESKey: document.encryptedAESKey,
            fileName: Buffer.from(document.encryptedMetadata, 'base64').toString('ascii'),
            category: document.category
        });

    } catch (error) {
        console.error('Get Document Details Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const { id } = params = req.params;
        const { email } = req.query;

        if (!email || !id) return res.status(400).json({ error: 'Email and ID required' });

        if (mongoose.connection.readyState === 1) {
            const user = await User.findOne({ email });
            if (!user) return res.status(404).json({ error: 'User not found' });

            await Document.deleteOne({ _id: id, userId: user._id });
        } else {
            const index = MOCK_DOCUMENTS.findIndex(doc => doc.id === id && doc.userEmail === email);
            if (index !== -1) {
                MOCK_DOCUMENTS.splice(index, 1);
            } else {
                return res.status(404).json({ error: 'Document not found or unauthorized' });
            }
        }

        res.json({ message: 'Document deleted securely' });
    } catch (error) {
        console.error('Delete Document Error:', error);
        res.status(500).json({ error: error.message });
    }
};
