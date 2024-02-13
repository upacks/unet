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
        _onTrigger(shake);
        channel.on(`${me}-${name}`, (sms) => sms === 'shake' && shake());
        channel.on(`all-${name}`, (sms) => sms === 'shake' && shake());
        channel.on("connect", () => shake());
        channel.on('disconnect', () => { });
        const pull = () => {
            g && utils_1.log.info(`[S.Pull] -> Start[0] / ${(0, utils_1.Now)()}`);
            _onPull((latest = {}) => {
                g && utils_1.log.info(`[S.Pull] -> Start[1] / ${(0, utils_1.Sfy)(latest).slice(0, 128)} [...]`);
                try {
                    latest = latest ?? {};
                    const _checkpoint = {
                        id: latest.id ?? '',
                        src: 'master',
                        dst: me,
                        updatedAt: latest.updatedAt ?? (0, utils_1.moment)().add(-(retain[0]), retain[1]).format(utils_1.dateFormat),
                    };
                    channel.pull(`${name}-pulling`, { checkpoint: _checkpoint }, (err, response) => {
                        if (err) {
                            utils_1.log.warn(`[S.Pull] -> Fail[1] / ${err.message ?? 'unknown'}`);
                            this.isBusy = false;
                            shake();
                        }
                        else {
                            const checkpoint = response?.checkpoint ?? {};
                            const items = response?.items ?? [];
                            g && utils_1.log.success(`[S.Pull] -> Success / ${(0, utils_1.Sfy)(checkpoint).slice(0, 128)} [...] / Items: ${items.length}`);
                            _onSave(items);
                            const _checkpoint = {
                                id: checkpoint.id ?? '',
                                src: me,
                                dst: checkpoint.dst ?? 'master',
                                updatedAt: checkpoint.updatedAt ?? (0, utils_1.moment)().add(-(retain[0]), retain[1]).format(utils_1.dateFormat),
                            };
                            g && utils_1.log.info(`[S.Push] -> Start / ${(0, utils_1.Sfy)(_checkpoint).slice(0, 128)} [...]`);
                            _onPush(_checkpoint, (rows) => {
                                g && utils_1.log.info(`[S.Push] -> Items / ${rows ? rows.length : '(-)'}`);
                                if (rows && rows.length > 0) {
                                    channel.push(`${name}-pushing`, { items: rows }, (err, data) => {
                                        if (err) {
                                            utils_1.log.warn(`[S.Push] -> Fail / ${err.message ?? 'unknown'}`);
                                        }
                                        else {
                                            g && utils_1.log.success(`[S.Push] -> Success / ${(0, utils_1.Sfy)(data).slice(0, 128)} [...]`);
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
                    utils_1.log.warn(`[S.Pull] -> Fail[0] / ${err.message ?? 'unknown'}`);
                    this.isBusy = false;
                    shake();
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
                g && utils_1.log.warn(` ✩ `);
                this.hopes = [];
                this.isBusy = true;
                this.lastPull = Date.now();
                pull();
            }
        }, this.delay);
    }
    onPull = (next) => {
        this.table.findOne({ where: { src: { [util_1.Op.not]: this.name } }, order: [['updatedAt', 'DESC'], ['id', 'DESC']], raw: true }).then(checkpoint => {
            next(checkpoint);
        }).catch(err => {
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