const net = require('net');
const { EventEmitter } = require('events');

class DatabaseProxy extends EventEmitter {
    constructor() {
        super();
        this.server = null;
        this.connections = new Set();
        this.upstreamConfig = null;
        this.localPort = 0;
    }

    start(config) {
        return new Promise((resolve, reject) => {
            if (this.server) {
                resolve(this.localPort);
                return;
            }

            this.upstreamConfig = config;
            this.server = net.createServer((socket) => this.handleConnection(socket));

            this.server.listen(0, '127.0.0.1', () => {
                const addr = this.server?.address();
                if (addr && typeof addr !== 'string') {
                    this.localPort = addr.port;
                    console.log(`[Proxy] Started on port ${this.localPort} -> ${config.host}:${config.port}`);
                    resolve(this.localPort);
                } else {
                    reject(new Error('Failed to get proxy port'));
                }
            });

            this.server.on('error', (err) => {
                console.error('[Proxy] Server error:', err);
                reject(err);
            });
        });
    }

    stop() {
        if (this.server) {
            this.server.close();
            this.server = null;
            this.connections.forEach(conn => conn.destroy());
            this.connections.clear();
            console.log('[Proxy] Stopped');
        }
    }

    handleConnection(clientSocket) {
        this.connections.add(clientSocket);

        const upstream = net.connect({
            host: this.upstreamConfig.host,
            port: this.upstreamConfig.port
        });

        // Pipeline
        clientSocket.on('data', (data) => {
            // Sniff packet
            this.sniffPacket(data);
            upstream.write(data);
        });

        upstream.on('data', (data) => {
            clientSocket.write(data);
        });

        // Error handling
        clientSocket.on('error', (err) => {
            console.error('[Proxy] Client error:', err.message);
            upstream.destroy();
        });

        upstream.on('error', (err) => {
            console.error('[Proxy] Upstream error:', err.message);
            clientSocket.destroy();
        });

        clientSocket.on('close', () => {
            upstream.end();
            this.connections.delete(clientSocket);
        });

        upstream.on('close', () => {
            clientSocket.end();
        });
    }

    sniffPacket(buffer) {
        try {
            // Postgres Protocol Sniffing
            // 'Q' (Query) message: 'Q' + int32(length) + string(query) + null
            if (this.upstreamConfig.type === 'postgres' && buffer[0] === 0x51) { // 'Q'
                const len = buffer.readUInt32BE(1);
                // Basic check to ensure buffer contains full query
                if (buffer.length >= len + 1) {
                    const query = buffer.toString('utf-8', 5, len + 1 - 1); // -1 for null terminator
                    console.log('[Proxy] Detected Query:', query);
                    this.emit('query', query);
                }
            }

            // MySQL Protocol Sniffing
            // Command Phase: int32(packet_len) + int8(seq) + int8(command) + string(query)
            // Command 0x03 is COM_QUERY
            if (this.upstreamConfig.type === 'mysql') {
                // MySQL packet header is 4 bytes (3 len + 1 seq)
                if (buffer.length > 4) {
                    const cmd = buffer[4];
                    if (cmd === 0x03) { // COM_QUERY
                        const query = buffer.toString('utf-8', 5);
                        console.log('[Proxy] Detected MySQL Query:', query);
                        this.emit('query', query);
                    }
                }
            }

        } catch (e) {
            // Ignore parsing errors, don't crash the proxy
        }
    }
}

module.exports = { DatabaseProxy };
