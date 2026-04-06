require('dotenv').config();

const rpName = 'SecurePass Vault';
const rpID = process.env.RP_ID || 'localhost';
const origin = process.env.FRONTEND_URL || `http://${rpID}:5173`;

module.exports = {
    rpName,
    rpID,
    origin,
};
