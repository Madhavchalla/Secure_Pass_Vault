const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');

// In production, these should be protected by JWT middleware
router.post('/upload', documentController.uploadDocument);
router.get('/', documentController.getDocuments);
router.get('/:id', documentController.getDocument);
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
