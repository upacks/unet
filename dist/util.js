"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = exports.tryAuthorize = exports.execute = exports.isAsync = exports.Sequelize = exports.Op = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const utils_1 = require("utils");
_a = (0, utils_1.PackageExists)('sequelize') ? require('sequelize') : { Op: {}, Sequelize: {} }, exports.Op = _a.Op, exports.Sequelize = _a.Sequelize;
const isAsync = (p) => p && (p.constructor.name === "AsyncFunction" || (typeof p === 'object' && typeof p.then === 'function'));
exports.isAsync = isAsync;
const execute = (f, req, res, content) => new Promise((resolve, reject) => {
    if (typeof f === 'object') {
        reject({ message: `Wrong` });
    }
    else {
        if ((0, exports.isAsync)(f)) {
            f(req, res, content).then((e) => {
                resolve(e);
            }).catch(e => {
                reject(e);
            });
        }
        else {
            resolve(f(req, res, content));
        }
    }
});
exports.execute = execute;
const tryAuthorize = (token = '', secret = '') => {
    try {
        const verify = jsonwebtoken_1.default.verify(token.split(' ')[1], secret);
        return {
            status: true,
            message: 'OK',
            ...(0, exports.authenticate)({ headers: { verified: 'yes', ...verify } })
        };
    }
    catch (err) {
        return { status: false, message: err.message };
    }
};
exports.tryAuthorize = tryAuthorize;
const authenticate = (req) => {
    if ('headers' in req) {
        const { verified, role } = req.headers;
        if (typeof verified === 'string' && verified === 'yes') {
            const roles = ['level-1', 'level-2', 'level-3', 'level-4', 'level-5'];
            if (typeof role === 'string' && roles.includes(role)) {
                try {
                    const { project, name } = req.headers;
                    return {
                        proj: project,
                        type: 'owner',
                        name: name,
                        level: roles.findIndex((s) => s === role) + 1,
                    };
                }
                catch { }
            }
            else {
                try {
                    const { project, type, name } = req.headers;
                    return {
                        proj: project,
                        type: typeof type === 'string' ? type : 'unknown',
                        name: name,
                        level: 0,
                    };
                }
                catch { }
            }
        }
    }
    return null;
};
exports.authenticate = authenticate;
//# sourceMappingURL=util.js.map