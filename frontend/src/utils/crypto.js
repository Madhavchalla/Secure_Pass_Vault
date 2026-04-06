/**
 * Client-Side Zero Knowledge Encryption Utilities using Web Crypto API.
 */

// Generate an RSA-OAEP Keypair for the user's device
export async function generateRSAKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true, // Must be true to export and save to localStorage
        // However, if we store in IndexedDB, extractable must be true to save it.
        // Or we use IndexedDB wrapKey. For simplicity of MVP without IndexedDB wrapper:
        // Extractable = true just to store in localStorage/IndexedDB
        ["encrypt", "decrypt"]
    );

    return keyPair;
}

// Convert CryptoKey to Base64 (for sending to server / storage)
export async function exportPublicKey(key) {
    const exported = await window.crypto.subtle.exportKey("spki", key);
    const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
    return btoa(exportedAsString);
}

// Import Public Key from Base64
export async function importPublicKey(pem) {
    const binaryDerString = atob(pem);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i);
    }

    return await window.crypto.subtle.importKey(
        "spki",
        binaryDer.buffer,
        {
            name: "RSA-OAEP",
            hash: "SHA-256",
        },
        true,
        ["encrypt"]
    );
}

// Export Private Key to store locally (e.g. IndexedDB or localStorage)
export async function exportPrivateKey(key) {
    const exported = await window.crypto.subtle.exportKey("pkcs8", key);
    const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
    return btoa(exportedAsString);
}

// Import Private Key locally
export async function importPrivateKey(pem) {
    const binaryDerString = atob(pem);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i);
    }

    return await window.crypto.subtle.importKey(
        "pkcs8",
        binaryDer.buffer,
        {
            name: "RSA-OAEP",
            hash: "SHA-256",
        },
        true,
        ["decrypt"]
    );
}

/**
 * Encrypt a File dynamically using a one-time AES key.
 * Encrypts the AES key using the User's RSA Public Key.
 */
export async function encryptDocumentForUpload(file, userPublicKeyStr) {
    const fileBuffer = await file.arrayBuffer();

    const aesKey = await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedFileBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        aesKey,
        fileBuffer
    );

    const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
    const userPublicKey = await importPublicKey(userPublicKeyStr);

    const encryptedAESKey = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        userPublicKey,
        rawAesKey
    );

    // Helper to safely convert large buffers to base64 without exceeding call stack
    const bufferToBase64 = (buffer) => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    };

    // Return base64 formats for JSON payload constraints
    const fileBase64 = bufferToBase64(encryptedFileBuffer);
    const aesBase64 = bufferToBase64(encryptedAESKey);
    const ivBase64 = bufferToBase64(iv);

    return {
        encryptedFile: `${ivBase64}:${fileBase64}`, // combine IV and Ciphertext
        encryptedAESKey: aesBase64
    };
}

/**
 * Decrypt a File locally.
 */
export async function decryptDocument(encryptedFilePayload, encryptedAESKeyBase64, userPrivateKeyStr) {
    const userPrivateKey = await importPrivateKey(userPrivateKeyStr);

    // Helper to safely convert large base64 to buffer
    const base64ToBuffer = (base64) => {
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    };

    // Decrypt the AES key
    const encryptedAESKeyBuffer = base64ToBuffer(encryptedAESKeyBase64);
    const rawAesKey = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        userPrivateKey,
        encryptedAESKeyBuffer
    );

    const aesKey = await window.crypto.subtle.importKey(
        "raw",
        rawAesKey,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );

    // Split IV and Ciphertext
    const [ivBase64, fileBase64] = encryptedFilePayload.split(':');
    const iv = base64ToBuffer(ivBase64);
    const encryptedFileBuffer = base64ToBuffer(fileBase64);

    // Decrypt File
    const decryptedFileBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        aesKey,
        encryptedFileBuffer
    );

    return decryptedFileBuffer;
}
