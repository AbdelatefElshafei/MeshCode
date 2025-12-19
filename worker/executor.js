const vm = require('vm');
const logger = require('./logger');

/**
 * Executes the user code against the provided test cases.
 * @param {string} userCode - The code to execute.
 * @param {Array} testCases - List of test cases.
 * @param {number} port - The worker port (for logging).
 * @returns {Array} - The results of the execution.
 */
function executeTests(userCode, testCases, port) {
    return testCases.map((test, idx) => {
        logger.debug('Test start', { port, index: idx, input: test.input });
        const sandbox = { input: test.input, result: null, console: { log: () => {} } };
        const start = Date.now();
        try {
            vm.createContext(sandbox);
            vm.runInContext(userCode, sandbox, { timeout: 1000 });
            const durationMs = Date.now() - start;
            const passed = JSON.stringify(sandbox.result) === JSON.stringify(test.expected);
            logger.info('Test result', { port, index: idx, passed, durationMs });
            return { passed, input: test.input, expected: test.expected, actual: sandbox.result, durationMs };
        } catch (e) {
            const durationMs = Date.now() - start;
            logger.error('Test error', { port, index: idx, error: e.message, durationMs });
            return { passed: false, error: e.message, durationMs };
        }
    });
}

module.exports = { executeTests };
