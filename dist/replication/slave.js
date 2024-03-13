"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplicaSlave = void 0;
const utils_1 = require("utils");
const util_1 = require("../util");
class ReplicaSlave {
    lastPull = Date.now();
    isBusy = false;
    hopes = [];
    success = 0;
    table;
    name;
    limit = 10;
    delay = 1000;
    onChangeCall = (...n) => true;
    constructor({ me, name, table, channel, debug, retain, limit, delay, onPull, onPush, onTrigger, onSave, onChange }) {
        util_1.Op.or ? null : utils_1.log.warn('Slave Replication requires Sequelize');
        this.table = table;
        this.name = me;
        this.limit = limit ?? 10;
        this.delay = delay ?? 1000;
        const g = debug === true;
        const _onPull = typeof onPull !== 'undefined' ? onPull : this.onPull;
        const _onPush = typeof onPush !== 'undefined' ? onPush : this.onPush;
        const _onSave = typeof onSave !== 'undefined' ? onSave : this.onSave;
        const _onTrigger = typeof onTrigger !== 'undefined' ? onTrigger : this.onTrigger;
        this.onChangeCall = onChange ?? ((...n) => true);
        const shake = (e = {}) => this.hopes.push(true);
        const tryAgain = () => { this.isBusy = false; shake(); return true; };
        _onTrigger(shake);
        let logs = [];
        channel.on(`${me}-${name}`, (sms) => sms === 'shake' && shake());
        channel.on(`all-${name}`, (sms) => sms === 'shake' && shake());
        channel.on("connect", () => shake());
        channel.on('disconnect', () => { });
        const pull = () => {
            const tid = `TID${Date.now()}`;
            if (logs.length > 0) {
                utils_1.log.warn(`~~~ ~~~ [${tid}] ~~~ ~~~`);
                for (const x of logs)
                    utils_1.log[x[0]](x[1]);
                utils_1.log.warn(``);
            }
            logs = [];
            logs.push(['success', `Loop starting @${Date.now()}`]);
            _onPull((latest = {}) => {
                try {
                    latest = latest ?? {};
                    const _cp1 = { id: latest.id ?? '', src: 'master', dst: me, updatedAt: latest.updatedAt ?? (0, utils_1.moment)().add(-(retain[0]), retain[1]).format(utils_1.dateFormat) };
                    logs.push(['success', `Found checkpoint ID:${_cp1.id}`]);
                    channel.pull(`${name}-pulling`, { checkpoint: _cp1, tid }, (err, response) => {
                        if (err) {
                            tryAgain() && logs.push(['error', err.message ?? 'Unknown']);
                        }
                        else {
                            const checkpoint = response?.checkpoint ?? {};
                            const items = response?.items ?? [];
                            logs.push(['success', `Received ${items.length} items & Saving them ...`]);
                            _onSave(items);
                            const _cp2 = { id: checkpoint.id ?? '', src: me, dst: checkpoint.dst ?? 'master', updatedAt: checkpoint.updatedAt ?? (0, utils_1.moment)().add(-(retain[0]), retain[1]).format(utils_1.dateFormat) };
                            logs.push(['success', `Checkpoint ID:${checkpoint.id} from the Server`]);
                            _onPush(_cp2, (rows) => {
                                if (rows && rows.length > 0) {
                                    logs.push(['success', `Pushing ${rows.length} items`]);
                                    channel.push(`${name}-pushing`, { items: rows, tid }, (err, data) => {
                                        if (err) {
                                            logs.push(['error', `${err.message ?? 'Unknown'}`]);
                                        }
                                        else {
                                            logs.push(['success', `${(0, utils_1.Sfy)(data).slice(0, 128)}`]);
                                            this.success = Date.now();
                                        }
                                        this.isBusy = false;
                                        if (items.length === limit || rows.length === limit) {
                                            shake();
                                        }
                                        return { err, data };
                                    });
                                }
                                else {
                                    logs.push(['success', `No items to push`]);
                                    if (items.length === limit) { //  || (rows && rows.length > 0 && rows.length === limit) Removing it
                                        this.isBusy = false;
                                        shake();
                                    }
                                    else {
                                        this.isBusy = false;
                                    }
                                }
                            });
                        }
                    });
                }
                catch (err) {
                    tryAgain() && logs.push(['error', err.message ?? 'Unknown']);
                }
            });
        };
        (0, utils_1.Loop)(() => {
            if ((Date.now() - this.success) > (15 * 1000)) {
                this.isBusy = false;
            }
            if ((Date.now() - this.lastPull) > (10 * 1000)) {
                shake();
            }
            if (this.hopes.length > 0 && this.isBusy === false && channel.cio.connected) {
                if ((Date.now() - this.lastPull) > 500) {
                    this.hopes = [];
                    this.isBusy = true;
                    this.lastPull = Date.now();
                    pull();
                }
            }
        }, this.delay);
    }
    onPull = (next) => {
        this.table.findOne({ where: { src: { [util_1.Op.not]: this.name } }, order: [['updatedAt', 'DESC'], ['id', 'DESC']], raw: true }).then(checkpoint => {
            next(checkpoint);
        }).catch((err) => {
            next(null);
        });
    };
    onPush = ({ id, src, dst, updatedAt }, next) => {
        this.table.findAll({
            where: { src, dst, [util_1.Op.or]: [{ updatedAt: { [util_1.Op.gt]: updatedAt } }, { id: { [util_1.Op.gt]: id }, updatedAt: { [util_1.Op.eq]: updatedAt } }] },
            limit: this.limit,
            order: [['updatedAt', 'ASC'], ['id', 'ASC']],
            raw: true,
        }).then(items => { next(items); }).catch(err => { next(null); });
    };
    onTrigger = (next) => {
        const notify = (item) => {
            this.onChangeCall(true);
            const emit = (e) => e && e.src === this.name && next(e);
            return Array.isArray(item) ? item.map(i => emit(i)) : emit(item);
        };
        this.table.afterCreate(state => notify(state));
        this.table.afterUpdate(state => notify(state));
        this.table.afterUpsert(state => notify(state));
        this.table.afterBulkUpdate(state => notify(state));
    };
    onSave = (rows) => {
        rows.map(async (e) => await this.table.upsert(e));
    };
}
exports.ReplicaSlave = ReplicaSlave;
//# sourceMappingURL=slave.js.map