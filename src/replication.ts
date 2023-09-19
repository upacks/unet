import { PackageExists, Loop, log, moment, dateFormat, Delay, Now } from 'utils'
import { Host } from './host'
import { Connection } from './connection'

const name: string = 'sequelize'
const { Op }: any = PackageExists(name) ? require(name) : { Op: {} }

export class ReplicaMaster {

    name
    table
    limit
    onChangeCall: any = (...n) => true

    constructor({ me, name, table, channel, debug, limit, onPull, onTrigger, onSave, onChange }: {
        me: string /** Device name */,
        name: string /** Table name */,
        table: any /** Sequel Table */,
        channel: Host /** Host endpoint */,
        debug?: boolean,
        limit?: number /** Rows in a request */,
        onPull?: () => {} | any /** Customize: Pull method */,
        onTrigger?: () => {} /** Customize: That listens Sequel events and triggers replication */,
        onSave?: () => {} | any /** Customize: Save method */,
        onChange?: () => {} /** Customize: Change method */,
    }) {

        Op.or ? null : log.warn('Master Replication requires Sequelize')

        this.name = me
        this.table = table
        this.limit = limit ?? 10
        const g = debug === true

        const _onPull = typeof onPull !== 'undefined' ? onPull : this.onPull
        const _onTrigger = typeof onTrigger !== 'undefined' ? onTrigger : this.onTrigger
        const _onSave = typeof onSave !== 'undefined' ? onSave : this.onSave

        this.onChangeCall = onChange ?? ((...n: any) => true)
        const shake = ({ dst }) => channel.emit(`${dst}-${name}`, 'shake')
        _onTrigger(shake)

        channel.on(`${name}-pulling`, async ({ query }) => {

            try {

                g && log.info(`[M.Pull] -> Start / ${JSON.stringify(query.checkpoint)}`)
                const { items, checkpoint } = await _onPull(query.checkpoint)
                g && log.info(`[M.Pull] -> End / ${JSON.stringify(checkpoint)}`)
                return { items: items ?? [], checkpoint: checkpoint ?? {} }

            } catch (error) {

                g && log.info(`[M.Pull] -> Fail / ${error.message}`)
                return { items: [], checkpoint: {} }

            }

        })

        channel.on(`${name}-pushing`, async ({ body }) => {

            try {
                g && log.info(`[M.Push] -> Start / ${JSON.stringify(body)}`)
                return await _onSave(body.items)
            } catch (error) {
                g && log.info(`[M.Push] -> Fail / ${JSON.stringify(error.message)}`)
                return 'fail'
            }

        })

    }

    onPull = async ({ id, dst, updatedAt }) => {

        try {

            const items = await this.table.findAll({
                limit: this.limit,
                where: { dst: { [Op.or]: [dst, 'all'] }, [Op.or]: [{ updatedAt: { [Op.gt]: updatedAt } }, { id: { [Op.gt]: id }, updatedAt: { [Op.eq]: updatedAt } }] },
                order: [['updatedAt', 'ASC']],
                raw: true,
            })

            const latest = await this.table.findOne({ where: { src: dst }, order: [['updatedAt', 'DESC']], raw: true })

            return { items: items ?? [], checkpoint: latest ?? {} }

        } catch (error: any) {

            return { items: [], checkpoint: {} }

        }

    }
    onTrigger = (next) => {

        const notify = (item) => {
            this.onChangeCall(true)
            const emit = (e) => e && e.src === this.name && next(e)
            return Array.isArray(item) ? item.map(i => emit(i)) : emit(item)
        }

        this.table.afterCreate(state => notify(state))
        this.table.afterUpdate(state => notify(state))
        this.table.afterUpsert(state => notify(state))

    }
    onSave = async (items) => {

        items.map(async (e) => await this.table.upsert(e))
        return 'Done'

    }


}

export class ReplicaSlave {

    lastPull = Date.now()
    isBusy = false
    hopes = []
    success = 0
    table
    name
    limit = 10
    delay = 1000
    onChangeCall: any = (...n) => true

    constructor({ me, name, table, channel, debug, retain, limit, delay, onPull, onPush, onTrigger, onSave, onChange }: {
        me: string /** Device name */,
        name: string /** Table name */,
        table: any /** Sequel Table */,
        channel: Connection/** Host endpoint */,
        retain: [number | any, string | any] /** [5,'days'] -> Last 5 days of data will be replicated */,
        debug?: boolean,
        limit?: number /** Rows in a request */,
        delay?: number /** Delay between request **/,
        onPull?: () => {} /** Customize: Pull method */,
        onPush?: () => {} /** Customize: Push method */,
        onTrigger?: () => {} /** Customize: That listens Sequel events and triggers replication */,
        onSave?: () => {} /** Customize: Save method */,
        onChange?: () => {} /** Customize: Change method */,
    }) {

        Op.or ? null : log.warn('Slave Replication requires Sequelize')

        this.table = table
        this.name = me
        this.limit = limit ?? 10
        this.delay = delay ?? 1000
        const g = debug === true

        const _onPull = typeof onPull !== 'undefined' ? onPull : this.onPull
        const _onPush = typeof onPush !== 'undefined' ? onPush : this.onPush
        const _onTrigger = typeof onTrigger !== 'undefined' ? onTrigger : this.onTrigger
        const _onSave = typeof onSave !== 'undefined' ? onSave : this.onSave

        this.onChangeCall = onChange ?? ((...n: any) => true)
        const shake = (e: any = {}) => this.hopes.push(true)
        _onTrigger(shake)

        channel.on(`${me}-${name}`, (sms) => sms === 'shake' && shake())
        channel.on(`all-${name}`, (sms) => sms === 'shake' && shake())

        channel.on("connect", () => shake())
        channel.on('disconnect', () => { })

        const pull = () => {

            g && log.info(`[S.Pull] -> Start[0] / ${Now()}`)

            _onPull((latest: any = {}) => {

                g && log.info(`[S.Pull] -> Start[1] / ${JSON.stringify(latest)}`)

                try {

                    latest = latest ?? {}
                    const _checkpoint = {
                        id: latest.id ?? '',
                        src: 'master',
                        dst: me,
                        updatedAt: latest.updatedAt ?? moment().add(-(retain[0]), retain[1]).format(dateFormat),
                    }

                    channel.pull(`${name}-pulling`, { checkpoint: _checkpoint }, (err, response) => {

                        if (err) {

                            g && log.warn(`[S.Pull] -> Fail[1] / ${err.message ?? 'unknown'}`)
                            this.isBusy = false
                            shake()

                        } else {

                            const checkpoint = response?.checkpoint ?? {}
                            const items = response?.items ?? []

                            g && log.success(`[S.Pull] -> Success / ${JSON.stringify(checkpoint)} / Items: ${items.length}`)

                            _onSave(items)

                            const _checkpoint = {
                                id: checkpoint.id ?? '',
                                src: me,
                                dst: checkpoint.dst ?? 'master',
                                updatedAt: checkpoint.updatedAt ?? moment().add(-(retain[0]), retain[1]).format(dateFormat),
                            }

                            g && log.info(`[S.Push] -> Start / ${JSON.stringify(_checkpoint)}`)

                            _onPush(_checkpoint, (rows) => {

                                g && log.info(`[S.Push] -> Items / ${rows ? rows.length : '(-)'}`)

                                if (rows && rows.length > 0) {

                                    channel.push(`${name}-pushing`, { items: rows }, (err, data) => {

                                        if (err) {
                                            g && log.warn(`[S.Push] -> Fail / ${err.message ?? 'unknown'}`)
                                        } else {
                                            g && log.success(`[S.Push] -> Success / ${JSON.stringify(data)}`)
                                            this.success = Date.now()
                                        }

                                        this.isBusy = false

                                        if (items.length === limit || rows.length === limit) { shake() }

                                        return { err, data }

                                    })

                                } else {

                                    if (items.length === limit) { //  || (rows && rows.length > 0 && rows.length === limit) Removing it
                                        this.isBusy = false
                                        shake()
                                    } else {
                                        this.isBusy = false
                                    }

                                }

                            })

                        }
                    })

                } catch (err) {

                    g && log.warn(`[S.Pull] -> Fail[0] / ${err.message ?? 'unknown'}`)
                    this.isBusy = false
                    shake()

                }

            })

        }

        Loop(() => {

            if ((Date.now() - this.success) > (15 * 1000)) { this.isBusy = false }
            if ((Date.now() - this.lastPull) > (10 * 1000)) { shake() }

            if (this.hopes.length > 0 && this.isBusy === false) {
                g && log.warn(` ✩ `)
                this.hopes = []
                this.isBusy = true
                this.lastPull = Date.now()
                pull()
            }

        }, this.delay)

    }

    onPull = (next: any) => {

        this.table.findOne({ where: { src: { [Op.not]: this.name } }, order: [['updatedAt', 'DESC']], raw: true }).then(checkpoint => {
            next(checkpoint)
        }).catch(err => {
            next(null)
        })

    }

    onPush = ({ id, src, dst, updatedAt }, next) => {

        this.table.findAll({
            where: { src, dst, [Op.or]: [{ updatedAt: { [Op.gt]: updatedAt } }, { id: { [Op.gt]: id }, updatedAt: { [Op.eq]: updatedAt } }] },
            limit: this.limit,
            order: [['updatedAt', 'ASC']],
            raw: true,
        }).then(items => { next(items) }).catch(err => { next(null) })

    }

    onTrigger = (next) => {

        const notify = (item) => {
            this.onChangeCall(true)
            const emit = (e) => e && e.src === this.name && next(e)
            return Array.isArray(item) ? item.map(i => emit(i)) : emit(item)
        }

        this.table.afterCreate(state => notify(state))
        this.table.afterUpdate(state => notify(state))
        this.table.afterUpsert(state => notify(state))
        this.table.afterBulkUpdate(state => notify(state))

    }

    onSave = (rows: any) => {

        rows.map(async (e) => await this.table.upsert(e))

    }

}
