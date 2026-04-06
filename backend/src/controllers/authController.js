const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Credential = require('../models/Credential');
const AuditLog = require('../models/AuditLog');
const { rpName, rpID, origin } = require('../config/webauthn');
const mongoose = require('mongoose');

// In-memory store for challenges and offline-demo users
const challengeStore = {};
const MOCK_USERS = [];
const MOCK_CREDENTIALS = [];

exports.getRegistrationOptions = async (req, res) => {
    try {
        const { email, clientOrigin } = req.query;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const reqOrigin = clientOrigin || req.get('origin') || origin;
        const dynamicRpID = reqOrigin ? new URL(reqOrigin).hostname : rpID;

        let user;
        let userCredentials = [];

        if (mongoose.connection.readyState === 1) {
            user = await User.findOne({ email });
            if (user) {
                userCredentials = await Credential.find({ userId: user._id || user.id });
            }
        } else {
            user = MOCK_USERS.find(u => u.email === email);
            if (user) {
                userCredentials = MOCK_CREDENTIALS.filter(c => c.userId === user.id);
            }
        }

        if (!user) {
            // We don't create the user yet, but we need an ID for options
            user = { id: new mongoose.Types.ObjectId().toString(), email };
        }

        const options = await generateRegistrationOptions({
            rpName,
            rpID: dynamicRpID,
            userID: new Uint8Array(Buffer.from(user._id ? user._id.toString() : user.id)),
            userName: user.email,
            attestationType: 'none',
            excludeCredentials: userCredentials.map(cred => ({
                id: cred.credentialID,
                type: 'public-key',
            })),
            authenticatorSelection: {
                residentKey: 'required',
                userVerification: 'required',
            }
        });

        // Save challenge
        challengeStore[email] = options.challenge;

        res.json(options);
    } catch (error) {
        console.error('getRegistrationOptions Error:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
};

exports.verifyRegistration = async (req, res) => {
    try {
        const { email, authResponse, encryptionPublicKey, clientOrigin } = req.body;

        const reqOrigin = clientOrigin || req.get('origin') || origin;
        const dynamicRpID = reqOrigin ? new URL(reqOrigin).hostname : rpID;
        const expectedChallenge = challengeStore[email];

        if (!expectedChallenge) {
            return res.status(400).json({ error: 'Challenge expired or not found' });
        }

        const verification = await verifyRegistrationResponse({
            response: authResponse,
            expectedChallenge,
            expectedOrigin: reqOrigin,
            expectedRPID: dynamicRpID,
            requireUserVerification: true,
        });

        if (verification.verified) {
            const { registrationInfo } = verification;
            const { credential } = registrationInfo;
            const { publicKey: credentialPublicKey, id: credentialID, counter } = credential;

            // Convert Uint8Array to Base64 for DB or In-Memory storage
            const publicKeyBase64 = Buffer.from(credentialPublicKey).toString('base64');
            const credentialIDBase64 = credentialID; // Already a string in v13

            let userId;

            if (mongoose.connection.readyState === 1) {
                let user = await User.findOne({ email });
                if (!user) {
                    user = await User.create({ email, encryptionPublicKey });
                }
                userId = user._id;

                await Credential.create({
                    userId: user._id,
                    credentialID: credentialIDBase64,
                    publicKey: publicKeyBase64,
                    counter,
                    deviceName: 'Registered Device'
                });

                await AuditLog.create({
                    userId: user._id,
                    action: 'REGISTER_SUCCESS',
                    ipHash: crypto.createHash('sha256').update(req.ip).digest('hex')
                });
            } else {
                console.log("No MongoDB - Saving to In-Memory arrays.");
                let user = MOCK_USERS.find(u => u.email === email);
                if (!user) {
                    user = { id: new mongoose.Types.ObjectId().toString(), email, encryptionPublicKey };
                    MOCK_USERS.push(user);
                }
                userId = user.id;

                MOCK_CREDENTIALS.push({
                    userId: user.id,
                    credentialID: credentialIDBase64,
                    publicKey: publicKeyBase64,
                    counter,
                    deviceName: 'Registered Device'
                });
            }

            delete challengeStore[email];

            // Issue JWT
            const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'supersecret', { expiresIn: '1h' });
            res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });

            res.json({ verified: true });
        } else {
            res.status(400).json({ error: 'Registration verification failed' });
        }
    } catch (error) {
        console.error('verifyRegistration Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getAuthenticationOptions = async (req, res) => {
    try {
        const { email, clientOrigin } = req.query;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const reqOrigin = clientOrigin || req.get('origin') || origin;
        const dynamicRpID = reqOrigin ? new URL(reqOrigin).hostname : rpID;

        let user;
        let userCredentials = [];

        if (mongoose.connection.readyState === 1) {
            user = await User.findOne({ email });
            if (user) {
                userCredentials = await Credential.find({ userId: user._id });
            }
        } else {
            user = MOCK_USERS.find(u => u.email === email);
            if (user) {
                userCredentials = MOCK_CREDENTIALS.filter(c => c.userId === user.id);
            }
        }

        if (!user) return res.status(404).json({ error: 'User not found' });
        if (!userCredentials.length) return res.status(404).json({ error: 'No credentials found' });

        const options = await generateAuthenticationOptions({
            rpID: dynamicRpID,
            allowCredentials: userCredentials.map((cred) => ({
                id: cred.credentialID, // Already a base64url string in v13
                type: 'public-key',
            })),
            userVerification: 'required',
        });

        challengeStore[email] = options.challenge;
        res.json(options);
    } catch (error) {
        console.error('getAuthenticationOptions Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.verifyAuthentication = async (req, res) => {
    try {
        const { email, authResponse, clientOrigin } = req.body;

        const reqOrigin = clientOrigin || req.get('origin') || origin;
        const dynamicRpID = reqOrigin ? new URL(reqOrigin).hostname : rpID;
        const expectedChallenge = challengeStore[email];

        if (!expectedChallenge) {
            return res.status(400).json({ error: 'Challenge expired or not found' });
        }

        let user;
        let credential;

        if (mongoose.connection.readyState === 1) {
            user = await User.findOne({ email });
            credential = await Credential.findOne({ credentialID: authResponse.id });
        } else {
            user = MOCK_USERS.find(u => u.email === email);
            credential = MOCK_CREDENTIALS.find(c => c.credentialID === authResponse.id);
        }

        if (!credential) {
            return res.status(404).json({ error: 'Credential not recognized' });
        }

        const verification = await verifyAuthenticationResponse({
            response: authResponse,
            expectedChallenge,
            expectedOrigin: reqOrigin,
            expectedRPID: dynamicRpID,
            credential: {
                id: credential.credentialID, // Base64URLString
                publicKey: Buffer.from(credential.publicKey, 'base64'), // Uint8Array
                counter: credential.counter,
            },
            requireUserVerification: true,
        });

        if (verification.verified) {
            const { authenticationInfo } = verification;

            if (mongoose.connection.readyState === 1) {
                credential.counter = authenticationInfo.newCounter;
                await credential.save();
                await AuditLog.create({
                    userId: user._id,
                    action: 'LOGIN_SUCCESS',
                    ipHash: crypto.createHash('sha256').update(req.ip).digest('hex')
                });
            } else {
                credential.counter = authenticationInfo.newCounter;
            }

            delete challengeStore[email];

            // Issue JWT
            const token = jwt.sign({ userId: user._id || user.id }, process.env.JWT_SECRET || 'supersecret', { expiresIn: '1h' });
            res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });

            res.json({ verified: true, user: { email: user.email, id: user._id || user.id } });
        } else {
            res.status(400).json({ error: 'Authentication verification failed' });
        }
    } catch (error) {
        console.error('verifyAuthentication Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.logout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
};
