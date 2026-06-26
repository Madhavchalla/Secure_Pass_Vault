# 🔐 Secure Pass Vault
https://secure-pass-vault.vercel.app/

**Secure Pass Vault** is a **Zero-Knowledge Passwordless Document Management System** that allows users to securely store and access documents using **biometric authentication (WebAuthn)** instead of passwords. Files are encrypted on the user's device using **AES-256** before being uploaded, ensuring that the server never has access to the actual document content.

## ✨ Features

- 🔑 Passwordless authentication with **WebAuthn (Fingerprint/Face ID)**
- 🔒 Client-side **AES-256** file encryption
- 🛡️ Zero-Knowledge Architecture
- 📂 Secure document upload and access
- 🔐 RSA-OAEP for secure key protection

## ⚙️ How It Works

1. Authenticate using biometrics (WebAuthn).
2. Generate or retrieve the user's encryption key.
3. Encrypt the document on the client side (AES-256).
4. Upload only the encrypted file to the server.
5. Authenticate again to access documents.
6. Decrypt the file locally in the browser.

## 🛠️ Tech Stack

- **Frontend:** React.js
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **Authentication:** WebAuthn (FIDO2)
- **Encryption:** AES-256, RSA-OAEP, Web Crypto API

## 🔒 Benefits

- No passwords to remember
- End-to-end encrypted document storage
- Protection against phishing and password attacks
- Server cannot access user data
