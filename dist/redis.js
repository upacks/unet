"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const utils_1 = require("utils");
/** REDIS-CLIENT */
const Redis = (args) => {
    args.id = args.id ?? (0, utils_1.Uid)();
    args.name = args.name ?? (0, utils_1.Uid)();
    const cb = args.on ?? ((type, message) => {
        type !== 'info' && type !== 'success' && utils_1.log[type](`${args.name} / ${message} `);
    });
    const conf = (key) => ({
        id: `${args.id}-${key}`,
        name: `${args.name}-${key}`,
        host: "localhost",
        port: 6379,
        retryStrategy: (times) => Math.min(times * 250, 15000),
        ...args,
    });
    const Redis = {
        Pub: new ioredis_1.default(conf('pub')),
        Sub: new ioredis_1.default(conf('sub')),
    };
    Redis.Pub
        .on('connect', () => cb('success', 'Publisher: Connected'))
        .on('ready', () => cb('info', 'Ready'))
        .on('error', (e) => cb('error', e.message))
        .on('close', () => cb('warn', 'Close'))
        .on('reconnecting', () => cb('warn', 'Reconnecting...'))
        .on('end', () => cb('warn', 'End'));
    Redis.Sub
        .on('connect', () => cb('success', 'Subscriber: Connected'))
        .on('ready', () => cb('info', 'Ready'))
        .on('error', (e) => cb('error', e.message))
        .on('close', () => cb('warn', 'Close'))
        .on('reconnecting', () => cb('warn', 'Reconnecting...'))
        .on('end', () => cb('warn', 'End'));
    return Redis;
};
exports.Redis = Redis;
//# sourceMappingURL=redis.js.map