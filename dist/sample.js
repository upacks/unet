"use strict";
/** TCP-Samples **/
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("utils");
const tcp_1 = require("./tcp");
const host_1 = require("./host");
const connection_1 = require("./connection");
const proxy_1 = require("./proxy");
require('dotenv').config();
const sequelize_1 = require("sequelize");
const master_1 = require("./replication2/master");
const slave_1 = require("./replication2/slave");
const test_1 = require("./replication2/test");
const REPLICA = async () => {
    const payload = test_1.state ?? test_1.chunk;
    const sequel = new sequelize_1.Sequelize(utils_1.env.DB_NAME, utils_1.env.DB_USER, utils_1.env.DB_PASS, {
        host: utils_1.env.DB_HOST,
        dialect: 'postgres',
        pool: { max: 16, min: 4, acquire: 30000, idle: 15000 },
        logging: (sql, timing) => { },
    });
    await sequel.authenticate();
    const m = sequel.define('rep_master', {
        id: { primaryKey: true, type: sequelize_1.DataTypes.STRING, defaultValue: () => (0, utils_1.Uid)() },
        proj: { type: sequelize_1.DataTypes.STRING, defaultValue: '' },
        type: { type: sequelize_1.DataTypes.STRING, defaultValue: '' },
        name: { type: sequelize_1.DataTypes.STRING, defaultValue: '' },
        data: { type: sequelize_1.DataTypes.TEXT, defaultValue: '' },
        src: { type: sequelize_1.DataTypes.STRING, defaultValue: 'master' },
        dst: { type: sequelize_1.DataTypes.STRING, defaultValue: '' },
        createdAt: { type: sequelize_1.DataTypes.STRING, defaultValue: () => (0, utils_1.Now)() },
        updatedAt: { type: sequelize_1.DataTypes.STRING, defaultValue: () => (0, utils_1.Now)() },
        deletedAt: { type: sequelize_1.DataTypes.STRING, defaultValue: null },
    }, { indexes: [{ unique: false, fields: ['type', 'src', 'dst', 'updatedAt'] }] });
    const s = sequel.define('rep_slave', {
        id: { primaryKey: true, type: sequelize_1.DataTypes.STRING, defaultValue: () => (0, utils_1.Uid)() },
        proj: { type: sequelize_1.DataTypes.STRING, defaultValue: '' },
        type: { type: sequelize_1.DataTypes.STRING, defaultValue: '' },
        name: { type: sequelize_1.DataTypes.STRING, defaultValue: '' },
        data: { type: sequelize_1.DataTypes.TEXT, defaultValue: '' },
        src: { type: sequelize_1.DataTypes.STRING, defaultValue: 'SV102' },
        dst: { type: sequelize_1.DataTypes.STRING, defaultValue: '' },
        createdAt: { type: sequelize_1.DataTypes.STRING, defaultValue: () => (0, utils_1.Now)() },
        updatedAt: { type: sequelize_1.DataTypes.STRING, defaultValue: () => (0, utils_1.Now)() },
        deletedAt: { type: sequelize_1.DataTypes.STRING, defaultValue: null },
    }, { indexes: [{ unique: false, fields: ['type', 'src', 'dst', 'updatedAt'] }] });
    await sequel.sync({ force: true });
    (0, utils_1.Loop)(async () => {
        await m.upsert({ proj: 'OT', type: 'state', name: 'S300', data: `OMG_THIS_IS_IT_${Date.now()}`, src: 'master', dst: 'SV102' });
        await m.upsert({ proj: 'KT', type: 'state', name: 'S300', data: `OMG_THIS_IS_IT_${Date.now()}`, src: 'master', dst: 'all' });
        await m.upsert({ proj: 'BT', type: 'state', name: 'S300', data: `OMG_THIS_IS_IT_${Date.now()}`, src: 'master', dst: 'DR102' });
        await s.upsert({ proj: 'OT', type: 'state', name: 'S100', data: `OMG_THIS_IS_IT_${Date.now()}`, src: 'SV102', dst: 'master' });
    }, 1000 * 10);
    (0, utils_1.Safe)(() => {
        const apim = new host_1.Host({ name: 'event', port: 4040, redis: false });
        const apis = new connection_1.Connection({ name: 'event', proxy: 'http://localhost:4040' });
        new master_1.rMaster({
            api: apim,
            sequel,
        });
        new slave_1.rSlave({
            api: apis,
            sequel: sequel,
            slave_name: 'SV102',
            models: [{
                    name: 'rep_slave',
                    direction: 'bidirectional',
                    size: 5,
                    retain: [7, 'days'],
                    delay_success: 7500,
                    delay_fail: 5000,
                    delay_loop: 500,
                }],
        });
    });
};
// REPLICA()
const HOST_AND_CONNECTION = () => {
    const pro = new proxy_1.Core({ port: 8080 });
    const api = new host_1.Host({ name: 'HOST', port: 5050 });
    api.on('/', () => 'hi');
    (0, utils_1.Loop)(() => api.emit('sms', `${Date.now()}`), 2500);
    const monit = () => {
        api.emitBy('sms', 'Boys', (user) => {
            console.log('server', user);
            return user.proj === 'VMP';
        });
    };
    (0, utils_1.Delay)(() => monit(), 8 * 1000);
    (0, utils_1.Delay)(() => monit(), 10 * 1000);
    (0, utils_1.Delay)(() => {
        const io = new connection_1.Connection({ name: 'HOST', proxy: 'http://localhost:5050', token: 'RB4c' });
        const OM = new connection_1.Connection({ name: 'HOST', proxy: 'http://localhost:5050', token: 'YXa7MGzOz8tnNoOlNodQHnj__3rLoLFecyYW_fzRB4c' });
        io.on('sms', (data) => console.log('IO', data));
        OM.on('sms', (data) => console.log('OM', data));
        (0, utils_1.Delay)(() => { io.cio.disconnect(); }, 15 * 1000);
        (0, utils_1.Delay)(() => { OM.cio.disconnect(); }, 18 * 1000);
    }, 2500);
};
const REPRODUCE_LOOP_ISSUE = () => {
    utils_1.log.info(`BN_RTCM server is running on ${process.pid} 🚀🚀🚀 \n`);
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
    source.onRestart = () => { };
    source.onInfo = (t, { type, message }) => {
        utils_1.log[type](`[${t}] -> ${message}`);
    };
    const dest = new tcp_1.NetClient(_.to, (client) => {
        ++_.dest.reconnect;
        client.on('data', (chunk) => {
            dest.last = _.dest.lastMessage = Date.now();
        });
    });
    dest.onInfo = (t, { type, message }) => {
        utils_1.log[type](`[${t}] -> ${message}`);
    };
    (0, utils_1.Loop)(() => { dest.last = Date.now(); }, 1000);
};
const HOST_SAMPLE = () => {
    const API = new host_1.Host({ name: 'none', port: 5050 });
    API.on('authorize', ({ headers, user }, res) => {
        console.log(headers);
        console.log(user);
        return 'Autorized';
    }, true);
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