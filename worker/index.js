const net = require('net');
const vm = require('vm');
const { decryptAES } = require('../shared/cryptoUtil');

const PORT = Number(process.argv[2]);

const server = net.createServer((socket) => {
    let buffer = '';
    socket.setEncoding('utf8');
    socket.on('data', (chunk) => {
        buffer += chunk;
        const idx = buffer.indexOf('\n');
        if (idx !== -1) {
            const line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            try {
                const { encryptedPayload } = JSON.parse(line);
                const decryptedString = decryptAES(encryptedPayload);
                const { userCode, testCases } = JSON.parse(decryptedString);
                console.log('Worker received', { port: PORT, encryptionType: 'AES', codeLength: typeof userCode === 'string' ? userCode.length : 0, testCount: Array.isArray(testCases) ? testCases.length : 0 });

                const results = testCases.map((test, idx) => {
                    console.log('Test start', { port: PORT, index: idx, input: test.input });
                    const sandbox = { input: test.input, result: null, console: { log: () => {} } };
                    const start = Date.now();
                    try {
                        vm.createContext(sandbox);
                        vm.runInContext(userCode, sandbox, { timeout: 1000 });
                        const durationMs = Date.now() - start;
                        const passed = JSON.stringify(sandbox.result) === JSON.stringify(test.expected);
                        console.log('Test result', { port: PORT, index: idx, passed, input: test.input, expected: test.expected, actual: sandbox.result, durationMs });
                        return { passed, input: test.input, expected: test.expected, actual: sandbox.result, durationMs };
                    } catch (e) {
                        const durationMs = Date.now() - start;
                        console.error('Test error', { port: PORT, index: idx, input: test.input, expected: test.expected, error: e.message, durationMs });
                        return { passed: false, error: e.message, durationMs };
                    }
                });

                const resp = JSON.stringify({ workerId: PORT, results }) + '\n';
                socket.write(resp);
                socket.end();
            } catch (err) {
                const resp = JSON.stringify({ error: 'Worker failed', message: err.message }) + '\n';
                socket.write(resp);
                socket.end();
            }
        }
    });
    socket.on('error', () => {});
});

server.listen(PORT, () => {
    console.log(`Worker TCP server listening on ${PORT}`);
});
