"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplicaHost = void 0;
const utils_1 = require("utils");
class ReplicaHost {
    cf = {
        step: 0,
        interval: 2500,
    };
    constructor({ bidirectional = true, interval = 2500 }) { }
    log = (x) => utils_1.log.info(x);
    /** Get latest from host **/
    last = async () => { };
    /** Pull N from host according to last(x) **/
    pull = async () => { };
    /** Pull N from host according to last(x) **/
    push = async () => { };
    save = async () => { };
    try_run = () => (0, utils_1.Loop)(async () => {
        try {
        }
        catch (err) { }
    }, this.cf.interval);
}
exports.ReplicaHost = ReplicaHost;
//# sourceMappingURL=client.js.map