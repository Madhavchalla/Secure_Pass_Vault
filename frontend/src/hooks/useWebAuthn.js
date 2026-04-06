import { useState } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { generateRSAKeyPair, exportPublicKey, exportPrivateKey, importPrivateKey } from '../utils/crypto';

export function useWebAuthn() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const register = async (email) => {
        setLoading(true);
        setError(null);
        try {
            // 1. Generate local RSA keys for document ZK encryption
            const keyPair = await generateRSAKeyPair();
            const pubKey = await exportPublicKey(keyPair.publicKey);
            const privKey = await exportPrivateKey(keyPair.privateKey);

            // Save Private Key safely (for demo, localStorage. In production, IndexedDB or wrapped)
            localStorage.setItem('securepass_private_key', privKey);
            localStorage.setItem('securepass_public_key', pubKey);

            const currentOrigin = window.location.origin;

            // 2. WebAuthn Registration
            const resp = await fetch(`https://backend-securepass.vercel.app/api/auth/generate-registration-options?email=${encodeURIComponent(email)}&clientOrigin=${encodeURIComponent(currentOrigin)}`);
            const options = await resp.json();

            if (options.error) throw new Error(options.error);

            // 3. Trigger Biometrics (TouchID/FaceID)
            const authResponse = await startRegistration(options);

            // 4. Verify on server
            const verifyResp = await fetch('https://backend-securepass.vercel.app/api/auth/verify-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, authResponse, encryptionPublicKey: pubKey, clientOrigin: currentOrigin }),
            });

            const verification = await verifyResp.json();
            if (!verification.verified || verification.error) {
                throw new Error(verification.error || "Registration validation failed silently");
            }

            return true;
        } catch (err) {
            console.error(err);
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const login = async (email) => {
        setLoading(true);
        setError(null);
        try {
            const currentOrigin = window.location.origin;
            const resp = await fetch(`https://backend-securepass.vercel.app/api/auth/generate-authentication-options?email=${encodeURIComponent(email)}&clientOrigin=${encodeURIComponent(currentOrigin)}`);
            const options = await resp.json();

            if (options.error) throw new Error(options.error);

            // Trigger Biometrics
            const authResponse = await startAuthentication(options);

            const verifyResp = await fetch('https://backend-securepass.vercel.app/api/auth/verify-authentication', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, authResponse, clientOrigin: currentOrigin }),
            });

            const verification = await verifyResp.json();
            if (!verification.verified || verification.error) {
                throw new Error(verification.error || "Authentication validation failed silently");
            }

            return verification.user;
        } catch (err) {
            console.error(err);
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { register, login, loading, error };
}
