const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const app = express();

// Security Middleware (Helmet)
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(cors({
    origin: true, // Dynamically reflect the request origin to allow Ngrok tunnels
    credentials: true
}));

// Parsers
app.use(express.json({ limit: '15mb' })); // Increased limit for document uploads
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

// Logger
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

// Health Check Route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'SecurePass Vault API is running.' });
});

const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[Error]:', err.message);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
    });
});

module.exports = app;
