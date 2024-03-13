"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplicaMaster = void 0;
const utils_1 = require("utils");
const util_1 = require("../util");
class ReplicaMaster {
    name;
    table;
    limit;
    onChangeCall = (...n) => true;
    constructor({ me, name, table, channel, authorize = false, debug, limit, onPull, onTrigger, onSave, onChange, onBeforeSave }) {
        util_1.Op.or ? null : utils_1.log.warn('Master Replication requires Sequelize');
        this.name = me;
        this.table = table;
        this.limit = limit ?? 10;
        const g = debug === true;
        const _onPull = typeof onPull !== 'undefined' ? onPull : this.onPull;
        const _onTrigger = typeof onTrigger !== 'undefined' ? onTrigger : this.onTrigger;
        const _onSave = typeof onSave !== 'undefined' ? onSave : this.onSave;
        if (typeof onBeforeSave !== 'undefined')
            this.onBeforeSave = onBeforeSave;
        this.onChangeCall = onChange ?? ((...n) => true);
        const shake = ({ dst }) => channel.emit(`${dst}-${name}`, 'shake');
        _onTrigger(shake);
        /** Pulling from Slave **/
        channel.on(`${name}-pulling`, async ({ user, query }) => {
            try {
                const { tid, checkpoint: cp } = query;
                g && utils_1.log.info(`[REP_${tid}] Pulling:Req ${(0, utils_1.Sfy)(cp).slice(0, 96)} [...]`);
                const { items, checkpoint } = await _onPull(cp, user);
                g && utils_1.log.info(`[REP_${tid}] Pulling:Res Items:${(items ?? []).length} Checkpoint: ${(checkpoint?.id ?? '#')}`);
                return { items: items ?? [], checkpoint: checkpoint ?? {} };
            }
            catch (error) {
                utils_1.log.warn(`[REP_${query.tid ?? '#'}] @Pulling / ${error.message}`);
                return { items: [], checkpoint: {} };
            }
        }, authorize);
        /** Pushing from Slave **/
        channel.on(`${name}-pushing`, async ({ user, body }) => {
            try {
                const { tid, items } = body;
                g && utils_1.log.info(`[REP_${tid}] Pushing ${(0, utils_1.Sfy)(body).slice(0, 128)} [...]`);
                return await _onSave(items, user);
            }
            catch (error) {
                utils_1.log.warn(`[REP_${body.tid ?? '#'}] @Pushing / ${error.message}`);
                return 'fail';
            }
        }, authorize);
    }
    /** Select from DB **/
    onPull = async ({ id, dst, updatedAt }, auth) => {
        try {
            const dest = ['all', dst];
            if (auth) {
                auth.proj && dest.push(auth.proj);
                auth.type && dest.push(auth.type);
                // Duplicated with var:"dst" auth.name && dest.push(auth.name)
                auth.proj && auth.type && dest.push(`${auth.proj}_${auth.type}`);
            }
            /** N-Items from Master to Slave **/
            const items = await this.table.findAll({
                limit: this.limit,
                where: {
                    dst: { [util_1.Op.or]: dest },
                    [util_1.Op.or]: [
                        { updatedAt: { [util_1.Op.gt]: updatedAt } },
                        { id: { [util_1.Op.gt]: id }, updatedAt: { [util_1.Op.eq]: updatedAt } }
                    ]
                },
                order: [['updatedAt', 'ASC'], ['id', 'ASC']],
                raw: true,
            });
            /** Cleaning the payload of deleted items **/
            for (const x of items)
                if (x.deletedAt !== null)
                    x.data = null;
            /** Last-Item of Slave **/
            const latest = await this.table.findOne({
                where: { src: dst },
                order: [['updatedAt', 'DESC'], ['id', 'DESC']],
                raw: true
            });
            return { items: items ?? [], checkpoint: latest ?? {} };
        }
        catch (error) {
            return { items: [], checkpoint: {} };
        }
    };
    /** Injecting Auth-Values into item **/
    onBeforeSave = (item, auth) => item;
    /** Insert to DB **/
    onSave = async (items, auth) => {
        items.map(async (e) => {
            if (auth)
                return await this.table.upsert(this.onBeforeSave(e, auth));
            else
                return await this.table.upsert(e);
        });
        return 'Done';
    };
    /** Notify to Slave **/
    onTrigger = (next) => {
        const notify = (item) => {
            this.onChangeCall(true);
            const emit = (e) => e && e.src === this.name && next(e);
            return Array.isArray(item) ? item.map(i => emit(i)) : emit(item);
        };
        this.table.afterCreate(state => notify(state));
        this.table.afterUpdate(state => notify(state));
        this.table.afterUpsert(state => notify(state));
    };
}
exports.ReplicaMaster = ReplicaMaster;
//# sourceMappingURL=master.js.map