"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = exports.isAsync = void 0;
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
//# sourceMappingURL=util.js.map