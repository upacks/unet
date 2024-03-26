"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rMaster = void 0;
const utils_1 = require("utils");
const common_1 = require("./common");
const util_1 = require("../util");
const demo = false;
class rMaster {
    _;
    cb = null;
    constructor(args) {
        utils_1.log.warn(`[M] Replication on Master [...]`);
        this._ = {
            ...args
        };
        this._.api.io.on('connection', (socket) => {
            socket.on('get_items', this.get_items);
            socket.on('get_last', this.get_last);
            socket.on('send_items', this.send_items);
        });
    }
    /** Slave request: Items according to checkpoint */
    get_items = async (data, callback) => {
        try {
            let { key, table_name, slave_name, last: { id, updatedAt }, size } = (0, common_1.unzip)(data);
            if (demo)
                table_name = 'rep_master'; /** Must be remove before production */
            const model = this._.sequel.models[table_name];
            // N-Items from Master to Slave
            const items = await model.findAll({
                where: {
                    dst: { [util_1.Op.or]: ['all', slave_name] },
                    [util_1.Op.or]: [
                        { updatedAt: { [util_1.Op.gt]: updatedAt } },
                        {
                            id: { [util_1.Op.gt]: id },
                            updatedAt: { [util_1.Op.eq]: updatedAt },
                        }
                    ]
                },
                order: [['updatedAt', 'ASC'], ['id', 'ASC']],
                limit: size,
                raw: true,
            });
            // Cleaning the payload of deleted items
            for (const x of items)
                if (x.deletedAt !== null)
                    x.data = null;
            console.log(`[M] Get_items:  [${key}|${table_name}|${slave_name}] [${id},${updatedAt},${size}]`);
            console.log(`[M] Get_items:  Found [${items?.length}] item(s)`);
            callback((0, common_1.zip)({ status: true, data: items }));
        }
        catch (err) {
            console.log(`[M] Get_items:  ${err.message}`);
            callback((0, common_1.zip)({ status: false, message: err.message }));
        }
    };
    /** Slave request: Checkpoint of slave */
    get_last = async (data, callback) => {
        try {
            let { key, table_name, slave_name } = (0, common_1.unzip)(data);
            if (demo)
                table_name = 'rep_master'; /** Must be remove before production */
            const model = this._.sequel.models[table_name];
            const item = await model.findOne({
                where: { src: slave_name },
                order: [['updatedAt', 'DESC'], ['id', 'DESC']],
                raw: true
            });
            const last = {
                id: item?.id ?? '',
                updatedAt: item?.updatedAt ?? '',
            };
            console.log(`[M] Get_last:   [${key}|${table_name}|${slave_name}]`);
            console.log(`[M] Get_last:   Found [${last.id},${last.updatedAt}]`);
            callback((0, common_1.zip)({ status: true, data: last }));
        }
        catch (err) {
            console.log(`[M] Get_last:   ${err.message}`);
            callback((0, common_1.zip)({ status: false, message: err.message }));
        }
    };
    /** Slave request: Sending items according to checkpoint */
    send_items = async (data, callback) => {
        try {
            let { key, table_name, slave_name, items } = (0, common_1.unzip)(data);
            if (demo)
                table_name = 'rep_master'; /** Must be remove before production */
            const model = this._.sequel.models[table_name];
            this.cb && this.cb(table_name, slave_name);
            for (const x of items)
                await model.upsert(x);
            console.log(`[M] Send_items: Saved [${items.length}]`);
            callback((0, common_1.zip)({ status: true, data: items.length ?? 0 }));
        }
        catch (err) {
            console.log(`[M] Send_items: ${err.message}`);
            callback((0, common_1.zip)({ status: false, message: err.message }));
        }
    };
    on_update = (cb) => this.cb = cb;
}
exports.rMaster = rMaster;
//# sourceMappingURL=master.js.map