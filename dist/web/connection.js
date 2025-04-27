"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Connection = void 0;
const axios_1 = __importDefault(require("axios"));
const web_1 = require("utils/web");
const { io } = require("socket.io-client");
const env = {};
const whoami = env.whoami ?? "Browser";
const proxy = env.proxy ?? window.location.origin;
const token = env.token ?? "-";
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
        web_1.log.success(`Creating connection: ${this.proxy}/${this.name}`);
        this.cio = io(this.proxy, {
            transports: ['websocket', 'polling'],
            path: `/${this.name}/socket.io/`,
            query: { host: this.name, whoami },
            auth: { token: `Bearer ${this.token}` },
            rejectUnauthorized: this.rejectUnauthorized,
        });
        this.cio.on("connect", () => {
            typeof this.cio.status === 'function' && this.cio.status('success');
            web_1.log.success(`ws:${this.name}: Connection made [${this.proxy}/${this.name}]`);
            this.cio.sendBuffer = [];
        });
        this.cio.on('disconnect', () => {
            typeof this.cio.status === 'function' && this.cio.status('error');
            web_1.log.warn(`ws:${this.name}: Disconnected [${this.proxy}/${this.name}]`);
            (0, web_1.Delay)(() => this.cio.connect(), 2500);
        });
        this.cio.on("reconnect", () => {
            typeof this.cio.status === 'function' && this.cio.status('warning');
        });
        this.cio.on("connect_error", (error) => {
            typeof this.cio.status === 'function' && this.cio.status('warning');
            try {
                web_1.log.error(`ws:${this.name}: ${error.type} / ${error.description.message}`);
            }
            catch {
                web_1.log.error(`ws:${this.name}: ${error.message}`);
            }
        });
        this.caxios = axios_1.default.create({
            baseURL: `${this.proxy}/${this.name}/`,
            timeout: this.timeout,
            headers: {
                'Accept': 'application/json',
                // 'Accept-Encoding': 'gzip', // Disabled due to warning -> Refused to set unsafe header "Accept-Encoding"
                'Authorization': `Bearer ${this.token}`,
                'whoami': whoami,
            },
            // httpAgent: new http.Agent({ keepAlive: true }),
            // httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: this.rejectUnauthorized }),
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
        const since = new web_1.Since(1000);
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
    status = (cb) => {
        this.cio.status = cb;
    };
}
exports.Connection = Connection;
//# sourceMappingURL=connection.js.map