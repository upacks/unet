"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rMaster = void 0;
const utils_1 = require("utils");
const common_1 = require("./common");
const util_1 = require("../util");
const demo = false;
class rMaster {
    _;
    kv = {};
    cb = null;
    constructor(args) {
        utils_1.log.warn(`[M] Replication on Master [...]`);
        this._ = {
            ...args
        };
        this._.api.io.on('connection', (socket) => {
            socket.on('get_last', this.get_last);
            socket.on('get_items', this.get_items);
            socket.on('send_items', this.send_items);
        });
    }
    /** Slave request: Checkpoint of slave */
    get_last = async (data, callback) => {
        const key = `GET:LAST:${(0, utils_1.ushort)()}`;
        try {
            let { table_name, slave_name } = (0, common_1.unzip)(data);
            (0, utils_1.ulog)(key, 'req', `${slave_name} latest value of ${table_name}`);
            if (demo)
                table_name = 'rep_master'; /** Must be remove before production */
            const model = this._.sequel.models[table_name];
            const item = await model.findOne({
                where: this.kv.hasOwnProperty(slave_name) ?
                    { src: slave_name, updatedAt: { [util_1.Op.gte]: this.kv[slave_name].updatedAt } } :
                    { src: slave_name },
                // order: [['updatedAt', 'id', 'DESC']],
                order: [['updatedAt', this._.sequel.literal(','), 'id', 'DESC']],
                raw: true
            });
            const last = { id: item?.id ?? '', updatedAt: item?.updatedAt ?? '' };
            if (item?.id && item?.updatedAt)
                this.kv[slave_name] = last;
            (0, utils_1.ulog)(key, 'then', `Found ${last.updatedAt}`, 'cloud', 'db');
            callback((0, common_1.zip)({ status: true, data: last }));
        }
        catch (err) {
            (0, utils_1.ulog)(key, 'catch', err.message, 'cloud', 'vehicle');
            callback((0, common_1.zip)({ status: false, message: err.message }));
        }
    };
    /** Slave request: Items according to checkpoint */
    get_items = async (data, callback) => {
        const key = `GET:ITEMS:${(0, utils_1.ushort)()}`;
        try {
            let { table_name, slave_name, last: { id, updatedAt }, size } = (0, common_1.unzip)(data);
            (0, utils_1.ulog)(key, 'req', `${slave_name} requesting items from ${table_name}`);
            if (demo)
                table_name = 'rep_master'; /** Must be remove before production */
            const model = this._.sequel.models[table_name];
            // N-Items from Master to Slave
            const items = await model.findAll({
                where: {
                    dst: { [util_1.Op.or]: ['all', slave_name] },
                    updatedAt: { [util_1.Op.gte]: updatedAt },
                    [util_1.Op.or]: [
                        { updatedAt: { [util_1.Op.gt]: updatedAt } },
                        { id: { [util_1.Op.gt]: id }, updatedAt: { [util_1.Op.eq]: updatedAt } }
                    ]
                },
                // order: [['updatedAt', 'id', 'ASC']],
                order: [['updatedAt', this._.sequel.literal(','), 'id', 'ASC']],
                limit: size,
                raw: true,
            });
            // Cleaning the payload of deleted items
            for (const x of items)
                if (x.deletedAt !== null)
                    x.data = null;
            (0, utils_1.ulog)(key, 'then', `Found ${items?.length} items`, 'cloud', 'db');
            callback((0, common_1.zip)({ status: true, data: items }));
        }
        catch (err) {
            (0, utils_1.ulog)(key, 'catch', err.message, 'cloud', 'vehicle');
            callback((0, common_1.zip)({ status: false, message: err.message }));
        }
    };
    /** Slave request: Sending items according to checkpoint */
    send_items = async (data, callback) => {
        const key = `SAVE:ITEMS:${(0, utils_1.ushort)()}`;
        try {
            let { table_name, slave_name, items } = (0, common_1.unzip)(data);
            (0, utils_1.ulog)(key, 'req', `${slave_name} is upserting into ${table_name}`);
            if (demo)
                table_name = 'rep_master'; /** Must be remove before production */
            const model = this._.sequel.models[table_name];
            this.cb && this.cb(table_name, slave_name);
            for (const x of items)
                await model.upsert(x);
            (0, utils_1.ulog)(key, 'then', `Saved ${items?.length} items`, 'cloud', 'db');
            callback((0, common_1.zip)({ status: true, data: items.length ?? 0 }));
        }
        catch (err) {
            (0, utils_1.ulog)(key, 'catch', err.message, 'cloud', 'vehicle');
            callback((0, common_1.zip)({ status: false, message: err.message }));
        }
    };
    on_update = (cb) => this.cb = cb;
}
exports.rMaster = rMaster;
//# sourceMappingURL=master.js.map