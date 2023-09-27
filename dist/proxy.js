"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Core = exports.Proxy = exports.httpProxy = exports.express = void 0;
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
exports.express = express_1.default;
const http_proxy_1 = __importDefault(require("http-proxy"));
exports.httpProxy = http_proxy_1.default;
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
    redis;
    store = {};
    config = {
        port: 8443,
        redisChannel: 'expose',
        keepAliveTimeout: (90 * 1000) + (1000 * 2),
        headersTimeout: (90 * 1000) + (1000 * 4),
        auth: null,
    };
    constructor(conf = {}) {
        this.config = { ...this.config, ...conf };
        this.redis = (0, redis_1.Redis)({});
        this.start();
    }
    start = () => {
        // ==================== PROXY-SERVER ==================== //
        utils_1.log.info(`[ START ] -> Proxy-Server`);
        const app = (0, express_1.default)();
        const _app = http_1.default.createServer(app);
        app.get('/', (req, res) => res.status(200).send(`:)`));
        app.get('/favicon.ico', (req, res) => res.status(204).end());
        app.get('/200', (req, res) => res.status(200).send(`:)`));
        app.get('/404', (req, res) => res.status(404).send(`:|`));
        app.get('/500', (req, res) => res.status(500).send(`:(`));
        this.config.auth && app.use(this.config.auth);
        const server = _app.listen(this.config.port);
        const apiProxy = http_proxy_1.default.createProxyServer();
        // ==================== PROXY-HANDLERS ==================== //
        utils_1.log.info(`[ START ] -> Proxy-Handlers`);
        const getPath = (url) => {
            try {
                return (this.store[url.split('/')[1]]).http;
            }
            catch {
                return null;
            }
        };
        /** Handling all the requests through Express **/
        app.all("*", (req, res) => {
            const target = getPath(req.originalUrl);
            target ? apiProxy.web(req, res, { target }) : res.status(404).end(':(');
        });
        server.on('upgrade', (req, socket, head) => {
            const target = getPath(req.url);
            target ? apiProxy.ws(req, socket, head, { target }) : socket.end(':(');
        });
        apiProxy.on('error', (err, req, res) => {
            utils_1.log.error(`While Proxying: ${err.message}`);
            try {
                res.writeHead(503, { 'Content-Type': 'text/plain' });
            }
            catch (err) { }
            res.end(`Service unavailable!`);
        });
        server.keepAliveTimeout = this.config.keepAliveTimeout;
        server.headersTimeout = this.config.headersTimeout;
        // ==================== REDIS-CLIENT ==================== //
        if (typeof this.redis.Sub === 'object') {
            utils_1.log.info(`[ START ] -> Proxy-Redis`);
            this.redis.Sub.subscribe(this.config.redisChannel, (err, e) => err ?
                utils_1.log.error(err.message) :
                utils_1.log.info(`Subscribed channels: ${e}`));
            this.redis.Sub.on("message", (channel, message) => {
                utils_1.log.success(`${channel}: ${message}`);
                const { name, http, ws } = JSON.parse(message);
                this.store[name] = { http, ws };
                this.redis.Pub.publish("expose_reply", name);
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