import { Loop, log, moment, dateFormat, Now, Sfy } from 'utils'
import { Connection } from '../connection'
import { Op } from '../util'

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
        const _onSave = typeof onSave !== 'undefined' ? onSave : this.onSave
        const _onTrigger = typeof onTrigger !== 'undefined' ? onTrigger : this.onTrigger

        this.onChangeCall = onChange ?? ((...n: any) => true)
        const shake = (e: any = {}) => this.hopes.push(true)
        const tryAgain = () => { this.isBusy = false; shake(); return true; }
        _onTrigger(shake)
        let logs: any = []

        channel.on(`${me}-${name}`, (sms) => sms === 'shake' && shake())
        channel.on(`all-${name}`, (sms) => sms === 'shake' && shake())

        channel.on("connect", () => shake())
        channel.on('disconnect', () => { })

        const pull = () => {

            const tid = `TID${Date.now()}`
            if (logs.length > 0) {
                log.warn(`~~~ ~~~ [${name}:${tid}:${process.pid}] ~~~ ~~~`)
                for (const x of logs) log[x[0]](x[1])
                log.warn(``)
            }

            logs = []
            logs.push(['success', `Loop starting @${Date.now()}`])

            _onPull((latest: any = {}) => {

                try {

                    latest = latest ?? {}
                    const _cp1 = { id: latest.id ?? '', src: 'master', dst: me, updatedAt: latest.updatedAt ?? moment().add(-(retain[0]), retain[1]).format(dateFormat) }
                    logs.push(['success', `Found checkpoint ID:${_cp1.id}`])

                    channel.pull(`${name}-pulling`, { checkpoint: _cp1, tid }, (err, response) => {

                        if (err) { tryAgain() && logs.push(['error', err.message ?? 'Unknown']) } else {

                            const checkpoint = response?.checkpoint ?? {}
                            const items = response?.items ?? []

                            logs.push(['success', `Received ${items.length} items & Saving them ...`])

                            _onSave(items)
                            const _cp2 = { id: checkpoint.id ?? '', src: me, dst: checkpoint.dst ?? 'master', updatedAt: checkpoint.updatedAt ?? moment().add(-(retain[0]), retain[1]).format(dateFormat) }

                            logs.push(['success', `Checkpoint ID:${checkpoint.id} from the Server`])

                            _onPush(_cp2, (rows) => {

                                if (rows && rows.length > 0) {

                                    logs.push(['success', `Pushing ${rows.length} items`])
                                    channel.push(`${name}-pushing`, { items: rows, tid }, (err, data) => {

                                        if (err) {
                                            logs.push(['error', `${err.message ?? 'Unknown'}`])
                                        } else {
                                            logs.push(['success', `${Sfy(data).slice(0, 128)}`])
                                            this.success = Date.now()
                                        }

                                        this.isBusy = false
                                        if (items.length === limit || rows.length === limit) { shake() }
                                        return { err, data }

                                    })

                                } else {

                                    logs.push(['success', `No items to push (Len: ${items.length} Lim: ${limit})`])
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

                } catch (err) { tryAgain() && logs.push(['error', err.message ?? 'Unknown']) }

            })

        }

        Loop(() => {

            if ((Date.now() - this.success) > (15 * 1000)) { this.isBusy = false }
            if ((Date.now() - this.lastPull) > (10 * 1000)) { shake() }

            if (this.hopes.length > 0 && this.isBusy === false && channel.cio.connected) {

                if ((Date.now() - this.lastPull) > 500) {

                    this.hopes = []
                    this.isBusy = true
                    this.lastPull = Date.now()
                    pull()

                }

            }

        }, this.delay)

    }

    onPull = (next: any) => {

        this.table.findOne({ where: { src: { [Op.not]: this.name } }, order: [['updatedAt', 'DESC'], ['id', 'DESC']], raw: true }).then(checkpoint => {
            next(checkpoint)
        }).catch((err) => {
            next(null)
        })

    }

    onPush = ({ id, src, dst, updatedAt }, next) => {

        this.table.findAll({
            where: { src, dst, [Op.or]: [{ updatedAt: { [Op.gt]: updatedAt } }, { id: { [Op.gt]: id }, updatedAt: { [Op.eq]: updatedAt } }] },
            limit: this.limit,
            order: [['updatedAt', 'ASC'], ['id', 'ASC']],
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
