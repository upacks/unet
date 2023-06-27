"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Host = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const utils_1 = require("utils");
const socket_io_1 = require("socket.io");
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const redis_1 = require("./redis");
const util_1 = require("./util");
const whoami = utils_1.env.whoami ?? "Master";
const ws = utils_1.env.ws ?? "ws://127.0.0.1";
const local = utils_1.env.local ?? "http://127.0.0.1";
class Host {
    server;
    requests = {};
    io;
    app;
    name;
    timeout;
    port;
    redis;
    constructor(conf) {
        this.name = conf.name;
        this.timeout = conf.timeout ?? 5000;
        this.port = conf.port ?? 0;
        this.redis = conf.hasOwnProperty('redis') ? conf.redis : true;
        utils_1.log.success(`Creating host: ${local}:${this.port}/${this.name}`);
        const { Pub, Sub } = this.redis ? (0, redis_1.Redis)({ name: this.name }) : { Pub: {}, Sub: {} };
        this.app = (0, express_1.default)();
        this.app.use((0, cors_1.default)({ origin: '*' }));
        this.app.use(express_1.default.json({ limit: '25mb' }));
        this.server = http_1.default.createServer(this.app);
        this.server.setTimeout(this.timeout);
        this.app.get(`/${this.name}/health`, (req, res) => res.status(200).send(`${this.name}-${(0, utils_1.Now)()}`));
        this.io = new socket_io_1.Server(this.server, {
            transports: ['websocket', 'polling'],
            path: `/${this.name}/socket.io/`,
        });
        this.io.on('connection', (socket) => {
            utils_1.log.success(`A client connected ${socket.id}`);
            socket.on('disconnect', () => utils_1.log.warn(`A client disconnected ${socket.id}`));
        });
        if (conf.static) {
            this.app.use(`/${this.name}`, express_1.default.static(path_1.default.join(__dirname, '..', '..', 'expose', conf.static)));
            this.app.use((0, express_fileupload_1.default)({ createParentPath: true }));
            this.app.post(`/${this.name}/upload`, async (req, res) => {
                try {
                    if (!req.files) {
                        res.status(400).send({ status: false, message: 'No file uploaded' });
                    }
                    else {
                        const file = req.files.file;
                        file.mv(path_1.default.join(__dirname, '..', '..', 'expose', conf.static, 'file/') + file.name);
                        res.send({ status: true, message: 'Uploaded', data: { name: file.name, mimetype: file.mimetype, size: file.size } });
                    }
                }
                catch (err) {
                    res.status(500).send(err);
                }
            });
            this.app.use(`/${this.name}`, (req, res) => {
                fs_1.default.readFile(path_1.default.join(__dirname, '..', '..', 'expose', conf.static, 'provider.html'), (err, content) => {
                    if (err) {
                        res.status(500).send(err.message);
                    }
                    else {
                        const cb = this.requests[req.path] ?? this.requests['*'] ?? null;
                        cb ? (0, util_1.execute)(cb, req, res, content.toString())
                            .then(e => res.send(e))
                            .catch(e => res.status(500).send(`console.log(${e.message})`)) :
                            res.status(404).send('console.log("Not found")');
                    }
                });
            });
        }
        else {
            this.app.use(`/${this.name}`, (req, res) => {
                const cb = this.requests[req.path] ?? this.requests['*'] ?? null;
                if (cb) {
                    (0, util_1.execute)(cb, req, res, '').then(e => {
                        res.send(e);
                    }).catch(e => {
                        res.status(500).send(e.message);
                    });
                }
                else {
                    res.status(404).send('Not found!');
                }
            });
        }
        this.app.use((err, req, res, next) => {
            utils_1.log.error(err.message);
            res.status(500).send(err.message);
        });
        const server = this.server.listen(this.port, '0.0.0.0', () => {
            this.redis && Pub.publish("expose", JSON.stringify({ name: this.name, http: `${local}:${server.address().port}`, ws: `${ws}:${server.address().port}`, whoami }));
            utils_1.log.success(`Created host: ${local}:${server.address().port}/${this.name}`);
        });
        server.keepAliveTimeout = (90 * 1000) + (1000 * 6);
        server.headersTimeout = (90 * 1000) + (1000 * 8);
    }
    emit = (channel, data) => {
        this.io.sockets.emit(channel, data);
    };
    on = (channel, callback) => {
        const y = (channel ?? '/')[0] === '/' || channel === '*';
        this.requests[y ? channel : `/${channel}`] = callback;
    };
    exit = () => {
        this.io.disconnectSockets();
    };
}
exports.Host = Host;
