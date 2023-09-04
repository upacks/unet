"use strict";
/** TCP-Samples **/
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("utils");
const tcp_1 = require("./tcp");
const host_1 = require("./host");
const proxy_1 = require("./proxy");
const HOST_SAMPLE = () => {
    const API = new host_1.Host({ name: 'none' });
};
const PROXY_SAMPLE = () => {
    utils_1.log.success(`PROXY_SAMPLE STARTED`);
    const Gate = new proxy_1.Core({});
    (0, utils_1.Loop)(() => { }, 250);
};
const TCP_SAMPLE = () => {
    utils_1.log.success(`TCP_SAMPLE STARTED`);
    (0, utils_1.Loop)(() => {
        const pid = process.pid;
        const ls = utils_1.Shell.exec(`netstat -ano | grep ${2101}`, { silent: true }).stdout;
        const nt = utils_1.Shell.exec(`netstat -lp --inet | grep "${pid}/node"`, { silent: true }).stdout;
        const pf = utils_1.Shell.exec(`ps -p ${pid} -o %cpu,%mem,cmd`, { silent: true }).stdout;
        console.log(ls);
        console.log(nt);
        console.log(pf);
    }, 5000);
    (0, utils_1.Delay)(() => {
        new tcp_1.NetServer({ port: 2101 }, (client) => {
            client.on('data', (data) => {
                const user = client.authenticate(data);
            });
        });
    }, 250);
    (0, utils_1.Delay)(() => {
        new tcp_1.NetClient({ port: 2101 }, (client) => {
            client.authenticate('my-token-:)');
            client.on('data', (data) => {
                utils_1.log.info(data);
            });
        });
    }, 500);
};
//# sourceMappingURL=sample.js.map