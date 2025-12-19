const crypto = require('crypto');

// Configuration
const AES_KEY = crypto.scryptSync('secret-key-aes', 'salt', 32); 
const AES_IV = Buffer.alloc(16, 0); 

const CryptoUtil = {
    // --- AES Methods ---
    encryptAES: (text) => {
        const cipher = crypto.createCipheriv('aes-256-cbc', AES_KEY, AES_IV);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    },
    decryptAES: (encryptedText) => {
        const decipher = crypto.createDecipheriv('aes-256-cbc', AES_KEY, AES_IV);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    },
    
};

module.exports = CryptoUtil;
