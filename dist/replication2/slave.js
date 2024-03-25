"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rSlave = void 0;
const utils_1 = require("utils");
const common_1 = require("./common");
const util_1 = require("../util");
class rSlave {
    _;
    cb = null;
    constructor(args) {
        utils_1.log.warn(`[R] Replication on Slave [...]`);
        this._ = {
            api: null,
            sequel: null,
            slave_name: '',
            msgpackr: true,
            parallel: false,
            debug: false,
            ...args,
        };
        this._.models.map((conf) => {
            conf = {
                direction: 'bidirectional',
                size: 5,
                retain: [90, 'days'],
                delay_success: 7500,
                delay_fail: 5000,
                delay_loop: 500,
                log: true,
                ...conf
            };
        });
        if (this._.parallel)
            this._.models.map((conf) => this.replicate([conf]));
        else
            this.replicate(this._.models);
    }
    pull = /** PULL METHOD */ {
        /** from Local */
        get_last: async ({ model, slave_name, retain, logs }, {}) => {
            const item = await model.findOne({
                where: { src: { [util_1.Op.not]: slave_name } },
                order: [['updatedAt', 'DESC'], ['id', 'DESC']],
                raw: true
            });
            return {
                id: item?.id ?? '',
                updatedAt: item?.updatedAt ?? (0, utils_1.moment)().add(-(retain[0]), retain[1]).format(utils_1.dateFormat),
            };
        },
        /** from Cloud */
        get_items: ({ key, table_name, slave_name, size, logs }, { pull_last }) => new Promise((res, rej) => {
            this._.api.cio.timeout(10 * 1000)
                .emit('get_items', (0, common_1.zip)({ key, table_name, slave_name, last: pull_last, size: size }), (err, response) => {
                try {
                    this._.debug && logs.push({ name: 'get_items', err, response });
                    if (err) {
                        rej(err.message);
                    }
                    else {
                        const { status, data, message } = (0, common_1.unzip)(response, logs);
                        if (status === true)
                            res(data);
                        else
                            rej(message ?? 'Unknown error from Cloud');
                    }
                }
                catch (err) {
                    rej(err.message);
                }
            });
        }),
        /** to Local (save) */
        save_items: async ({ model, table_name, slave_name }, { pull_items }) => {
            this.cb && this.cb(table_name, slave_name);
            for (const x of pull_items)
                await model.upsert(x);
            return 'Done';
        },
    };
    push = /** PUSH METHOD */ {
        /** from Cloud */
        get_last: ({ key, table_name, slave_name, logs }, {}) => new Promise((res, rej) => {
            this._.api.cio.timeout(10 * 1000).emit('get_last', (0, common_1.zip)({ key, table_name, slave_name }), (err, response) => {
                try {
                    this._.debug && logs.push({ name: 'get_last', err, response });
                    if (err) {
                        rej(err.message);
                    }
                    else {
                        const { status, data, message } = (0, common_1.unzip)(response, logs);
                        if (status === true)
                            res(data);
                        else
                            rej(message ?? 'Unknown error from Cloud');
                    }
                }
                catch (err) {
                    rej(err.message);
                }
            });
        }),
        /** from Local */
        get_items: async ({ model, master_name, slave_name, size }, { push_last }) => {
            const { id, updatedAt } = push_last;
            return model.findAll({
                where: {
                    src: slave_name,
                    dst: master_name,
                    [util_1.Op.or]: [{ updatedAt: { [util_1.Op.gt]: updatedAt } }, { id: { [util_1.Op.gt]: id }, updatedAt: { [util_1.Op.eq]: updatedAt } }]
                },
                limit: size,
                order: [['updatedAt', 'ASC'], ['id', 'ASC']],
                raw: true,
            });
        },
        /** to Cloud (send) */
        send_items: ({ key, table_name, slave_name, logs }, { push_items }) => new Promise((res, rej) => {
            this._.api.cio.timeout(10 * 1000).emit('send_items', (0, common_1.zip)({ key, table_name, slave_name, items: push_items }, logs), (err, response) => {
                try {
                    this._.debug && logs.push({ name: 'send_items', err, response });
                    if (err) {
                        rej(err.message);
                    }
                    else {
                        const { status, data, message } = (0, common_1.unzip)(response, logs);
                        if (status === true)
                            res(data);
                        else
                            rej(message ?? 'Unknown error from Cloud');
                    }
                }
                catch (err) {
                    rej(err.message);
                }
            });
        }),
    };
    replicate = (ls = []) => {
        let free = true;
        let length = ls.length;
        let index = 0;
        let logs = [];
        let skip = [];
        this._.api.on(this._.slave_name, ([table_name]) => { });
        (0, utils_1.Loop)(() => free && (0, utils_1.Safe)(async () => {
            free = false;
            const key = Date.now();
            const { name, direction, retain, size, delay_success, delay_fail, delay_loop } = ls[index];
            try {
                if (typeof skip[index] === 'number' && skip[index] > 0) {
                    --skip[index];
                }
                else {
                    /** INITIATE **/
                    logs.push(`[R] Start:      [${index}|${key}|${name}]`);
                    const model = this._.sequel.models[name];
                    const arg = { key, index, model, table_name: name, master_name: 'master', slave_name: this._.slave_name, retain, size, logs };
                    const tmp = { start: Date.now() };
                    /** METHOD: PULL **/ if (direction === 'bidirectional' || direction === 'pull-only') {
                        logs.push(`[R] Get_last:   From Local [...]`);
                        tmp.pull_last = await this.pull.get_last(arg, tmp);
                        this._.debug && logs.push(tmp.pull_last);
                        logs.push(`[R] Get_items:  From Cloud [...]`);
                        tmp.pull_items = await this.pull.get_items(arg, tmp);
                        this._.debug && logs.push(tmp.pull_items);
                        logs.push(`[R] Save_items: To Local [${Array.isArray(tmp.pull_items) ? tmp.pull_items.length : '-'}]`);
                        tmp.pull_saved = await this.pull.save_items(arg, tmp);
                        this._.debug && logs.push(tmp.pull_saved);
                    }
                    /** METHOD: PUSH **/ if (direction === 'bidirectional' || direction === 'push-only') {
                        logs.push(`[R] Get_last:   From Cloud [...]`);
                        tmp.push_last = await this.push.get_last(arg, tmp);
                        this._.debug && logs.push(tmp.push_last);
                        logs.push(`[R] Get_items:  From Local[...]`);
                        tmp.push_items = await this.push.get_items(arg, tmp);
                        this._.debug && logs.push(tmp.push_items);
                        logs.push(`[R] Send_items: To Cloud [...]`);
                        tmp.push_sent = await this.push.send_items(arg, tmp);
                        this._.debug && logs.push(tmp.push_sent);
                    }
                    /** When there are items to be pushed or pulled */
                    if (tmp.pull_items?.length === size) {
                        skip[index] = 0;
                        logs.push(`[R] Sleep:      Next ${skip[index]} loop(s) / There are items to Pull`);
                    }
                    else if (tmp.push_items?.length === size) {
                        skip[index] = 0;
                        logs.push(`[R] Sleep:      Next ${skip[index]} loop(s) / There are items to Push`);
                    }
                    else {
                        skip[index] = Math.ceil(delay_success / delay_loop);
                        logs.push(`[R] Sleep:      Next ${skip[index]} loop(s) / No items to Pull or Push`);
                    }
                }
            }
            catch (err) {
                skip[index] = Math.ceil(delay_fail / delay_loop);
                logs.push(`[R] Sleep:      Next ${skip[index]} loop(s) / due to ${err.message}`);
            }
            finally {
                if (logs.length) {
                    console.log(``);
                    for (const x of logs)
                        console.log(x);
                    logs = [];
                }
                await (0, utils_1.AsyncWait)(delay_loop);
                index = (index + 1) >= length ? 0 : (index + 1);
                free = true;
            }
        }), 10);
    };
    on_update = (cb) => this.cb = cb;
}
exports.rSlave = rSlave;
//# sourceMappingURL=slave.js.map