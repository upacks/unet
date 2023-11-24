"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplicaSlave = exports.ReplicaMaster = void 0;
const utils_1 = require("utils");
const name = 'sequelize';
const { Op } = (0, utils_1.PackageExists)(name) ? require(name) : { Op: {} };
class ReplicaMaster {
    name;
    table;
    limit;
    onChangeCall = (...n) => true;
    constructor({ me, name, table, channel, debug, limit, onPull, onTrigger, onSave, onChange }) {
        Op.or ? null : utils_1.log.warn('Master Replication requires Sequelize');
        this.name = me;
        this.table = table;
        this.limit = limit ?? 10;
        const g = debug === true;
        const _onPull = typeof onPull !== 'undefined' ? onPull : this.onPull;
        const _onTrigger = typeof onTrigger !== 'undefined' ? onTrigger : this.onTrigger;
        const _onSave = typeof onSave !== 'undefined' ? onSave : this.onSave;
        this.onChangeCall = onChange ?? ((...n) => true);
        const shake = ({ dst }) => channel.emit(`${dst}-${name}`, 'shake');
        _onTrigger(shake);
        channel.on(`${name}-pulling`, async ({ query }) => {
            try {
                g && utils_1.log.info(`[M.Pull] -> Start / ${(0, utils_1.Sfy)(query.checkpoint).slice(0, 128)} [...]`);
                const { items, checkpoint } = await _onPull(query.checkpoint);
                g && utils_1.log.info(`[M.Pull] -> End / ${(0, utils_1.Sfy)(checkpoint).slice(0, 128)} [...]`);
                return { items: items ?? [], checkpoint: checkpoint ?? {} };
            }
            catch (error) {
                utils_1.log.warn(`[M.Pull] -> Fail / ${error.message}`);
                return { items: [], checkpoint: {} };
            }
        });
        channel.on(`${name}-pushing`, async ({ body }) => {
            try {
                g && utils_1.log.info(`[M.Push] -> Start / ${(0, utils_1.Sfy)(body).slice(0, 128)} [...]`);
                return await _onSave(body.items);
            }
            catch (error) {
                utils_1.log.warn(`[M.Push] -> Fail / ${(0, utils_1.Sfy)(error.message)} [...]`);
                return 'fail';
            }
        });
    }
    onPull = async ({ id, dst, updatedAt }) => {
        try {
            const items = await this.table.findAll({
                limit: this.limit,
                where: { dst: { [Op.or]: [dst, 'all'] }, [Op.or]: [{ updatedAt: { [Op.gt]: updatedAt } }, { id: { [Op.gt]: id }, updatedAt: { [Op.eq]: updatedAt } }] },
                order: [['updatedAt', 'ASC'], ['id', 'ASC']],
                raw: true,
            });
            const latest = await this.table.findOne({ where: { src: dst }, order: [['updatedAt', 'DESC'], ['id', 'DESC']], raw: true });
            return { items: items ?? [], checkpoint: latest ?? {} };
        }
        catch (error) {
            return { items: [], checkpoint: {} };
        }
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
    };
    onSave = async (items) => {
        items.map(async (e) => await this.table.upsert(e));
        return 'Done';
    };
}
exports.ReplicaMaster = ReplicaMaster;
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
        Op.or ? null : utils_1.log.warn('Slave Replication requires Sequelize');
        this.table = table;
        this.name = me;
        this.limit = limit ?? 10;
        this.delay = delay ?? 1000;
        const g = debug === true;
        const _onPull = typeof onPull !== 'undefined' ? onPull : this.onPull;
        const _onPush = typeof onPush !== 'undefined' ? onPush : this.onPush;
        const _onTrigger = typeof onTrigger !== 'undefined' ? onTrigger : this.onTrigger;
        const _onSave = typeof onSave !== 'undefined' ? onSave : this.onSave;
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
        this.table.findOne({ where: { src: { [Op.not]: this.name } }, order: [['updatedAt', 'DESC'], ['id', 'DESC']], raw: true }).then(checkpoint => {
            next(checkpoint);
        }).catch(err => {
            next(null);
        });
    };
    onPush = ({ id, src, dst, updatedAt }, next) => {
        this.table.findAll({
            where: { src, dst, [Op.or]: [{ updatedAt: { [Op.gt]: updatedAt } }, { id: { [Op.gt]: id }, updatedAt: { [Op.eq]: updatedAt } }] },
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
//# sourceMappingURL=replication.js.map