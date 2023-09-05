"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetClient = exports.NetServer = void 0;
const net_1 = __importDefault(require("net"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const utils_1 = require("utils");
class NetServer {
    host;
    port;
    alias;
    server;
    clients = [];
    secret;
    constructor({ host, port, secret }, cb) {
        this.host = host ?? '127.0.0.1';
        this.port = port ?? 0;
        this.secret = secret ?? utils_1.env.secret ?? 'secret';
        this.alias = `TCP-Host ${this.host} ${this.port}`;
        this.create(cb);
    }
    verify = (token) => {
        try {
            return jsonwebtoken_1.default.verify(token, this.secret);
        }
        catch (err) {
            return null;
        }
    };
    create = (cb) => {
        try {
            this.server = net_1.default.createServer();
            this.server.listen(this.port, this.host, () => {
                utils_1.log.success(`${this.alias}: Started!`);
                this.server.on('connection', (client) => {
                    const alias = `${client.remoteAddress}:${client.remotePort}`;
                    utils_1.log.success(`${this.alias}: ${alias} / Connected!`);
                    client.id = (0, utils_1.Uid)();
                    client.isAuthenticated = false;
                    client.decoded = null;
                    this.clients.push(client);
                    client.authenticate = (token) => {
                        if (client.isAuthenticated) {
                            return client.decoded;
                        }
                        else {
                            const decoded = this.verify(token);
                            if (decoded) {
                                client.isAuthenticated = true;
                                client.decoded = decoded;
                                utils_1.log.success(`${this.alias}: Authorized!`);
                                return decoded;
                            }
                            else {
                                utils_1.log.warn(`${this.alias}: Authorization failed / ${token}`);
                                client.write('Unauthorization failed!\r\n');
                                (0, utils_1.Delay)(() => client.destroy(), 2500);
                                return null;
                            }
                        }
                    };
                    client.on('close', (data) => {
                        let index = this.clients.findIndex((o) => o.remoteAddress === client.remoteAddress && o.remotePort === client.remotePort);
                        index !== -1 && this.clients.splice(index, 1);
                        utils_1.log.warn(`${this.alias}: ${alias} / [idx_${index}] Disconnected!`);
                    });
                    cb(client);
                });
            });
        }
        catch (err) {
            utils_1.log.error(`${this.alias}: While starting ${err.message}`);
            this.port !== 0 && (0, utils_1.Delay)(() => this.create(cb), 15 * 1000);
        }
    };
}
exports.NetServer = NetServer;
class NetClient {
    client;
    config;
    callback;
    last = Date.now();
    constructor({ host, port, token }, cb) {
        this.config = {
            host: host ?? '127.0.0.1',
            port: port ?? 0,
            token: token ?? '#',
        };
        this.callback = cb;
        this.start();
        (0, utils_1.Loop)(() => {
            /** Consider ( as channel broken ) when server doesn't send message for over 30 (+~5) second **/
            if (Date.now() - this.last > (30 * 1000)) {
                this.last = Date.now();
                this.restart();
            }
        }, 5 * 1000);
    }
    log = (s) => utils_1.log.info(`TCP.Connection ${this.config.host}: ${s}`);
    restart = () => {
        try {
            this.log(`Removing current connections and listeners ...`);
            this.client.removeAllListeners();
            this.client.destroy();
        }
        catch (err) {
            this.log(`While Removing current connections: ${err.message}`);
        }
        finally {
            (0, utils_1.Delay)(() => this.start(), 15 * 1000);
        }
    };
    start = () => {
        this.log(`Starting a new NET.SOCKET ...`);
        this.client = new net_1.default.Socket();
        this.client.authenticate = (token) => this.client.write(token);
        this.client.connect(this.config, () => {
            this.log(`Connection established with the server`);
            this.callback(this.client);
        });
        /* this.client.on('data', (chunk: any) => {
            try {
                this.last = Date.now()
                this.log(`Data received from the server [${chunk.toString().length}]`)
                this.callback(chunk)
            } catch (err) { }
        }) */
        this.client.on('error', (err) => {
            this.log(`On.Error / ${err.message}`);
            this.restart();
        });
        this.client.on('close', () => {
            this.log(`On.Close triggered!`);
            this.restart();
        });
        this.client.on('end', () => {
            this.log(`On.End triggered!`);
            this.restart();
        });
    };
}
exports.NetClient = NetClient;
//# sourceMappingURL=tcp.js.map