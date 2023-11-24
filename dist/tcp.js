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
    onInfo = (type, _log) => utils_1.log[_log.type](_log.message);
    constructor({ host, port, secret }, cb) {
        this.host = host ?? '127.0.0.1';
        this.port = port ?? 0;
        this.secret = secret ?? utils_1.env.secret ?? 'secret';
        this.alias = `TCP_Server<${this.host}:${this.port}>`;
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
                this.onInfo('success', { type: 'success', message: `${this.alias} Started!` });
                this.server.on('connection', (client) => {
                    const alias = `<${client.remoteAddress}:${client.remotePort}>`;
                    client.id = (0, utils_1.Uid)();
                    client.isAuthenticated = false;
                    client.decoded = null;
                    this.clients.push(client);
                    this.onInfo('success', { type: 'success', message: `${this.alias} <- ${alias} [${client.id}] Connected!` });
                    client.authenticate = (token) => {
                        if (client.isAuthenticated) {
                            return client.decoded;
                        }
                        else {
                            const decoded = this.verify(token);
                            if (decoded) {
                                client.isAuthenticated = true;
                                client.decoded = decoded;
                                this.onInfo('success', { type: 'success', message: `${this.alias} <- ${alias} [${client.id}] Authorized!` });
                                return decoded;
                            }
                            else {
                                this.onInfo('warning', { type: 'warn', message: `${this.alias} <- ${alias} [${client.id}] Authorization failed` });
                                client.write('Unauthorization failed!\r\n');
                                (0, utils_1.Delay)(() => client.destroy(), 2500);
                                return null;
                            }
                        }
                    };
                    const exit = (t) => {
                        let index = this.clients.findIndex((o) => o.remoteAddress === client.remoteAddress && o.remotePort === client.remotePort);
                        index !== -1 && this.clients.splice(index, 1);
                        try {
                            this.onInfo('warning', { type: 'warn', message: `${this.alias} <- ${alias} [${index}] Disconnected [${t}]!` });
                            client.end(t);
                            client.destroy();
                        }
                        catch { }
                    };
                    client.on('timeout', () => exit('Timeout'));
                    client.on('error', () => exit('Error'));
                    client.on('close', () => exit('Close'));
                    client.on('end', () => exit('End'));
                    client.on('drain', () => {
                        this.onInfo('warning', { type: 'warn', message: 'Write buffer is empty now .. u can resume the writable stream' });
                        client.resume();
                    });
                    cb(client);
                });
            });
        }
        catch (err) {
            this.onInfo('error', { type: 'error', message: `${this.alias} While starting ${err.message}` });
            this.port !== 0 && (0, utils_1.Delay)(() => this.create(cb), 15 * 1000);
        }
    };
}
exports.NetServer = NetServer;
class NetClient {
    client;
    config;
    last = Date.now();
    isRestarting = false;
    alias = 'TCP_Client<0:0>';
    callback;
    onRestart = () => { };
    onInfo = (type, _log) => utils_1.log[_log.type](_log.message);
    constructor({ host, port, token }, cb) {
        this.config = {
            host: host ?? '127.0.0.1',
            port: port ?? 0,
            token: token ?? '#',
        };
        this.alias = `TCP_Client<${this.config.host}:${this.config.port}>`;
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
    restart = () => {
        if (this.isRestarting) {
            return 0;
        }
        this.isRestarting = true;
        this.onInfo('loading', { type: 'warn', message: `${this.alias} Removing current connections and listeners ...` });
        (0, utils_1.Delay)(() => {
            try {
                this.client.removeAllListeners();
                this.client.destroy();
                this.onRestart();
            }
            catch (err) {
                this.onInfo('error', { type: 'error', message: `${this.alias} While Removing current connections: ${err.message}` });
            }
            finally {
                this.onInfo('loading', { type: 'warn', message: `${this.alias} Autimatically restart in 15 seconds ...` });
                (0, utils_1.Delay)(() => {
                    this.isRestarting = false;
                    this.start();
                }, 15 * 1000);
            }
        }, 1000);
    };
    start = () => {
        this.onInfo('info', { type: 'req', message: `${this.alias} Starting a new NET.SOCKET ...` });
        this.client = new net_1.default.Socket();
        this.client.authenticate = (token) => this.client.write(token);
        this.client.connect(this.config, () => {
            this.onInfo('success', { type: 'success', message: `${this.alias} Connection established with the server` });
            this.callback(this.client);
        });
        this.client.on('error', (err) => {
            this.onInfo('error', { type: 'error', message: `${this.alias} On.Error / ${err.message}` });
            this.restart();
        });
        this.client.on('close', () => {
            this.onInfo('warning', { type: 'warn', message: `${this.alias} On.Close triggered!` });
            this.restart();
        });
        this.client.on('end', () => {
            this.onInfo('warning', { type: 'warn', message: `${this.alias} On.End triggered!` });
            this.restart();
        });
    };
}
exports.NetClient = NetClient;
//# sourceMappingURL=tcp.js.map