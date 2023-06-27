"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Core = exports.Proxy = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const http_proxy_1 = __importDefault(require("http-proxy"));
const utils_1 = require("utils");
const redis_1 = require("./redis");
class Proxy {
    apiProxy;
    constructor() {
        this.apiProxy = http_proxy_1.default.createProxyServer();
    }
    http = (req, res, url) => this.apiProxy.web(req, res, { target: url });
    ws = (req, socket, head, url) => this.apiProxy.ws(req, socket, head, { target: url });
}
exports.Proxy = Proxy;
class Core {
    config = {
        port0: 8080,
        port: 8443,
        redisChannel: 'expose',
        keepAliveTimeout: (90 * 1000) + (1000 * 2),
        headersTimeout: (90 * 1000) + (1000 * 4),
    };
    store = {};
    redis;
    constructor(conf) {
        this.config = conf;
        this.redis = (0, redis_1.Redis)({});
        this.start();
    }
    start = () => {
        utils_1.log.info(`Starting a new HTTP.Proxy ...`);
        // ==================== PROXY-SERVER ==================== //
        const app = (0, express_1.default)();
        const ppp = (0, express_1.default)();
        const kapp = http_1.default.createServer(app);
        app.get('/', (req, res) => res.status(500).send(`Sorry:(`));
        ppp.listen(this.config.port0);
        const server = kapp.listen(this.config.port);
        const apiProxy = http_proxy_1.default.createProxyServer();
        const getPath = (url) => { try {
            return (this.store[url.split('/')[1]]).http;
        }
        catch (error) {
            return `http://localhost:${this.config.port0}`;
        } };
        // ==================== PROXY-HANDLERS ==================== //
        app.all("*", (req, res) => apiProxy.web(req, res, { target: getPath(req.originalUrl) }));
        server.on('upgrade', (req, socket, head) => apiProxy.ws(req, socket, head, { target: getPath(req.url) }));
        apiProxy.on('error', (err, req, res) => {
            utils_1.log.error(`While Proxying: ${err.message}`);
            try {
                res.writeHead(503, { 'Content-Type': 'text/plain' });
            }
            catch (err) { }
            res.end(`Under maintenance!`);
        });
        server.keepAliveTimeout = this.config.keepAliveTimeout;
        server.headersTimeout = this.config.headersTimeout;
        // ==================== REDIS-CLIENT ==================== //
        if (typeof this.redis.Sub === 'object') {
            this.redis.Sub.subscribe(this.config.redisChannel, (err, e) => err ?
                utils_1.log.error(err.message) :
                utils_1.log.info(`Subscribed channels: ${e}`));
            this.redis.Sub.on("message", (channel, message) => {
                utils_1.log.success(`${channel}: ${message}`);
                const { name, http, ws } = JSON.parse(message);
                this.store[name] = { http, ws };
            });
        }
    };
    stop = () => {
        try {
            utils_1.log.info(`Removing current connections and listeners ...`);
        }
        catch (err) {
            utils_1.log.warn(`While Removing current connections: ${err.message}`);
        }
    };
}
exports.Core = Core;
//# sourceMappingURL=proxy.js.map