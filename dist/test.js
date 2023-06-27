"use strict";
/** TCP-Samples **/
Object.defineProperty(exports, "__esModule", { value: true });
const tcp_1 = require("./tcp");
const utils_1 = require("utils");
utils_1.log.success(`${process.pid} ${process.ppid}`);
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
//# sourceMappingURL=test.js.map