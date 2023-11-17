"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Connection = void 0;
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const axios_1 = __importDefault(require("axios"));
const utils_1 = require("utils");
const { io } = require("socket.io-client");
const whoami = utils_1.env.whoami ?? "Master";
const proxy = utils_1.env.proxy ?? "http://127.0.0.1:8443";
const token = utils_1.env.token ?? "-";
// ==================== CLASS: CONNECTION ==================== //
class Connection {
    cio;
    caxios;
    name;
    token;
    proxy;
    timeout;
    rejectUnauthorized;
    constructor(conf) {
        this.name = conf.name ?? '-';
        this.token = conf.token ?? token;
        this.proxy = conf.proxy ?? proxy;
        this.timeout = conf.timeout ?? 5000;
        this.rejectUnauthorized = typeof conf.rejectUnauthorized === 'boolean' ? conf.rejectUnauthorized : true;
        utils_1.log.success(`Creating connection: ${this.proxy}/${this.name}`);
        this.cio = io(this.proxy, {
            transports: ['websocket', 'polling'],
            path: `/${this.name}/socket.io/`,
            query: { host: this.name, whoami },
            auth: { token: `Bearer ${this.token}` },
            rejectUnauthorized: this.rejectUnauthorized,
        });
        this.cio.on("connect", () => {
            utils_1.log.success(`ws:${this.name}: Connection made [${this.proxy}/${this.name}]`);
            this.cio.sendBuffer = [];
        });
        this.cio.on('disconnect', () => {
            utils_1.log.warn(`ws:${this.name}: Disconnected [${this.proxy}/${this.name}]`);
            (0, utils_1.Delay)(() => this.cio.connect(), 2500);
        });
        this.cio.on("connect_error", (error) => {
            try {
                utils_1.log.error(`ws:${this.name}: ${error.type} / ${error.description.message}`);
            }
            catch {
                utils_1.log.error(`ws:${this.name}: ${error.message}`);
            }
        });
        this.caxios = axios_1.default.create({
            baseURL: `${this.proxy}/${this.name}/`,
            timeout: this.timeout,
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${this.token}`,
                'whoami': whoami,
            },
            httpAgent: new http_1.default.Agent({ keepAlive: true }),
            httpsAgent: new https_1.default.Agent({ keepAlive: true, rejectUnauthorized: this.rejectUnauthorized }),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });
    }
    connect = () => this.cio.connect();
    exit = () => this.cio.disconnect();
    /** _____________________________________________________________ HTTP-Client _____________________________________________________________ **/
    get = (channel, data) => new Promise((resolve, reject) => {
        this.caxios.get(channel, { params: data })
            .then(({ data }) => resolve(data))
            .catch(reject);
    });
    set = (channel, data) => new Promise((resolve, reject) => {
        this.caxios.post(channel, data)
            .then(({ data }) => resolve(data))
            .catch(reject);
    });
    pull = (channel, data, cb) => {
        if (typeof cb === 'undefined')
            return this.get(channel, data);
        else
            return this.get(channel, data)
                .then(response => cb(null, response))
                .catch(err => cb(err, null));
    };
    push = (channel, data, cb) => {
        if (typeof cb === 'undefined')
            return this.set(channel, data);
        else
            return this.set(channel, data)
                .then(response => cb(null, response))
                .catch(err => cb(err, null));
    };
    /** _____________________________________________________________ HTTP/WS-Client _____________________________________________________________ **/
    poll = (channel, data, cb) => {
        const since = new utils_1.Since(1000);
        const update = () => this.pull(channel, data, cb);
        since.call(() => update());
        this.cio.on(channel, (go) => go && since.add());
        update();
    };
    /** _____________________________________________________________ WS-Client _____________________________________________________________ **/
    emit = (channel, data, volatile = false) => {
        volatile ? this.cio.volatile.emit(channel, data) : this.cio.emit(channel, data);
    };
    on = (channel, cb) => {
        this.cio.on(channel, cb);
    };
}
exports.Connection = Connection;
//# sourceMappingURL=connection.js.map