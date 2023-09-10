"use strict";
/** TCP-Samples **/
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("utils");
const tcp_1 = require("./tcp");
const host_1 = require("./host");
const proxy_1 = require("./proxy");
const REPRODUCE_LOOP_ISSUE = () => {
    utils_1.log.info(`BN_RTCM server is running on ${process.pid} 🚀🚀🚀`);
    const API = new host_1.Host({ name: 'bn' });
    const _ = {
        from: { host: "10.10.1.65", port: 8080 },
        to: { host: "143.198.198.77", port: 2202 },
        source: {
            lastMessage: 0,
            reconnect: 0,
        },
        dest: {
            lastMessage: 0,
            reconnect: 0,
        }
    };
    API.on('me', () => _);
    const source = new tcp_1.NetClient(_.from, (client) => {
        ++_.source.reconnect;
        client.on('data', (chunk) => (0, utils_1.Safe)(() => {
            source.last = _.source.lastMessage = Date.now();
            dest.client.write(chunk);
        }));
    });
    source.onRestart = () => {
        utils_1.log.warn(`ABOUT TO RESTART ${source.alias} -------------------------------------->>>`);
    };
    const dest = new tcp_1.NetClient(_.to, (client) => {
        ++_.dest.reconnect;
        client.on('data', (chunk) => {
            dest.last = _.dest.lastMessage = Date.now();
        });
    });
    (0, utils_1.Loop)(() => { dest.last = Date.now(); }, 1000);
};
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