import { PackageExists, Loop, log, moment, dateFormat } from 'utils'

const name: string = 'sequelize'
const { Op }: any = PackageExists(name) ? require(name) : { Op: {} }
Op.or ? log.success('Replication is ready') : log.warn('Replication requires Sequelize')

export class ReplicaMaster {

    name
    table
    limit
    onChangeCall = (...n) => true

    constructor({ me, name, table, debug, channel, limit, onPull, onSave, onTrigger, onChange }) {

        this.name = me
        this.table = table
        this.limit = limit
        const g = debug === true

        const _onPull = typeof onPull !== 'undefined' ? onPull : this.onPull
        const _onTrigger = typeof onTrigger !== 'undefined' ? onTrigger : this.onTrigger
        const _onSave = typeof onSave !== 'undefined' ? onSave : this.onSave

        this.onChangeCall = onChange ?? ((...n: any) => true)
        const shake = ({ dst }) => channel.emit(`${dst}-${name}`, 'shake')
        _onTrigger(shake)

        channel.on(`${name}-pulling`, async ({ query }) => {

            try {

                g && log.info(`M.Pulling Start -> ${JSON.stringify(query.checkpoint)}`)
                const { items, checkpoint } = await _onPull(query.checkpoint)
                g && log.info(`M.Pulling End -> ${JSON.stringify(checkpoint)}`)
                return { items: items ?? [], checkpoint: checkpoint ?? {} }

            } catch (error) {

                g && log.info(`M.Pulling Fail -> ${error.message}`)
                return { items: [], checkpoint: {} }

            }

        })

        channel.on(`${name}-pushing`, async ({ body }) => {

            try {
                g && log.info(`M.Pushing Start -> ${JSON.stringify(body)}`)
                return await _onSave(body.items)
            } catch (error) {
                g && log.info(`M.Pushing Fail -> ${JSON.stringify(error.message)}`)
                return 'fail'
            }

        })

    }

    onPull = async ({ id, dst, updatedAt }) => {

        const items = await this.table.findAll({
            limit: this.limit,
            where: { dst: { [Op.or]: [dst, 'all'] }, [Op.or]: [{ updatedAt: { [Op.gt]: updatedAt } }, { id: { [Op.gt]: id }, updatedAt: { [Op.eq]: updatedAt } }] },
            order: [['updatedAt', 'ASC']],
            raw: true,
        })

        const latest = await this.table.findOne({ where: { src: dst }, order: [['updatedAt', 'DESC']], raw: true })

        return { items: items ?? [], checkpoint: latest ?? {} }

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
    delay = 750
    onChangeCall = (...n) => true

    constructor({ me, name, table, channel, debug, retain, limit, onPull, onPush, onTrigger, onSave, onChange }) {

        this.table = table
        this.name = me
        this.limit = limit
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

        const pull = () => _onPull((latest: any = {}) => {

            g && log.info(`S.Pull Start -> ${JSON.stringify(latest)}`)

            try {

                latest = latest ?? {}
                const _checkpoint = {
                    id: latest.id ?? '',
                    src: 'master',
                    dst: me,
                    updatedAt: latest.updatedAt ?? moment().add(-(retain[0]), retain[1]).format(dateFormat),
                }

                channel.pull(`${name}-pulling`, { checkpoint: _checkpoint }, (err, { items, checkpoint }) => {

                    if (err) {

                        this.isBusy = false
                        shake()
                        g && log.info(`S.Pull Fail  -> ${JSON.stringify(err.message)}`)

                    } else {

                        g && log.info(`S.Pull Success -> ${JSON.stringify(checkpoint)} / Items: ${items.length}`)

                        _onSave(items)

                        checkpoint = checkpoint ?? {}
                        const _checkpoint = {
                            id: checkpoint.id ?? '',
                            src: me,
                            dst: checkpoint.dst ?? 'master',
                            updatedAt: checkpoint.updatedAt ?? moment().add(-(retain[0]), retain[1]).format(dateFormat),
                        }

                        g && log.info(`S.Push Start -> ${JSON.stringify(_checkpoint)}`)

                        _onPush(_checkpoint, (rows) => {

                            g && log.info(`S.Pushing -> Items: ${rows ? rows.length : '(-)'}`)

                            if (rows && rows.length > 0) {

                                channel.push(`${name}-pushing`, { items: rows }, (err, data) => {

                                    if (err) {
                                        g && log.info(`S.Push Fail -> ${JSON.stringify(err.message)}`)
                                    } else {
                                        g && log.info(`S.Push Success -> ${JSON.stringify(data)}`)
                                        this.success = Date.now()
                                    }

                                    this.isBusy = false

                                    if (items.length === limit || rows.length === limit) { shake() }

                                    return { err, data }

                                })

                            } else {

                                if (items.length === limit || rows.length === limit) {

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
                console.log(err)
                g && log.info(`S.Pull Fail  -> ${err.message}`)
                this.isBusy = false
                shake()
            }

        })

        Loop(() => {

            if ((Date.now() - this.success) > (15 * 1000)) { this.isBusy = false }
            if ((Date.now() - this.lastPull) > (10 * 1000)) { shake() }

            if (this.hopes.length > 0 && this.isBusy === false) {
                g && log.info(` ✩ `)
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
