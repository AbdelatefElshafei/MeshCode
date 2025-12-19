const { decryptAES } = require('../shared/cryptoUtil');
const { executeTests } = require('./executor');
const logger = require('./logger');

/**
 * Processes a single message from the orchestrator.
 * @param {string} messageLine - The JSON string received.
 * @param {number} port - The worker port.
 * @returns {string} - The response string to send back.
 */
function processMessage(messageLine, port) {
    try {
        const { encryptedPayload } = JSON.parse(messageLine);
        const decryptedString = decryptAES(encryptedPayload);
        const { userCode, testCases } = JSON.parse(decryptedString);
        
        logger.info('Worker received payload', { port, encryptionType: 'AES', codeLength: typeof userCode === 'string' ? userCode.length : 0, testCount: Array.isArray(testCases) ? testCases.length : 0 });

        const results = executeTests(userCode, testCases, port);
        return JSON.stringify({ workerId: port, results }) + '\n';
    } catch (err) {
        logger.error('Worker failed processing', { error: err.message });
        return JSON.stringify({ error: 'Worker failed', message: err.message }) + '\n';
    }
}

module.exports = { processMessage };
