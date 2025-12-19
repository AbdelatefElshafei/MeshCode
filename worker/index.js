const net = require('net');
const logger = require('./logger');
const { processMessage } = require('./processor');

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
            
            const response = processMessage(line, PORT);
            socket.write(response);
            socket.end();
        }
    });

    socket.on('error', (err) => {
        logger.error('Socket error', { error: err.message });
    });
});

server.listen(PORT, () => {
    logger.info(`Worker TCP server listening`, { port: PORT });
});
