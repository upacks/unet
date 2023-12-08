import { log, Sfy } from 'utils'
import { Host, tUser } from '../host'
import { Op } from '../util'

export class ReplicaMaster {

    name
    table
    limit
    onChangeCall: any = (...n) => true

    constructor({ me, name, table, channel, authorize = false, debug, limit, onPull, onTrigger, onSave, onChange, onBeforeSave }: {
        me: string /** Device name */,
        name: string /** Table name */,
        table: any /** Sequel Table */,
        channel: Host /** Host endpoint */,
        authorize?: boolean /** Require Bearer & Will try to save @tUser */,
        limit?: number /** Rows in a request */,
        debug?: boolean,
        onPull?: () => {} | any /** Customize: Pull method */,
        onTrigger?: () => {} /** Customize: That listens Sequel events and triggers replication */,
        onSave?: () => {} | any /** Customize: Save method */,
        onChange?: () => {} /** Customize: Change method */,
        onBeforeSave?: (item: any, auth: tUser) => any /** Customize: BeforeSave mathod */,
    }) {

        Op.or ? null : log.warn('Master Replication requires Sequelize')

        this.name = me
        this.table = table
        this.limit = limit ?? 10
        const g = debug === true

        const _onPull = typeof onPull !== 'undefined' ? onPull : this.onPull
        const _onTrigger = typeof onTrigger !== 'undefined' ? onTrigger : this.onTrigger
        const _onSave = typeof onSave !== 'undefined' ? onSave : this.onSave
        if (typeof onBeforeSave !== 'undefined') this.onBeforeSave = onBeforeSave

        this.onChangeCall = onChange ?? ((...n: any) => true)
        const shake = ({ dst }) => channel.emit(`${dst}-${name}`, 'shake')

        _onTrigger(shake)

        /** Pulling from Slave **/
        channel.on(`${name}-pulling`, async ({ user, query }) => {

            try {

                g && log.info(`[M.Pull] -> Start / ${Sfy(query.checkpoint).slice(0, 128)} [...]`)
                const { items, checkpoint } = await _onPull(query.checkpoint, user)
                return { items: items ?? [], checkpoint: checkpoint ?? {} }

            } catch (error) {

                log.warn(`[M.Pull] -> Fail / ${error.message}`)
                return { items: [], checkpoint: {} }

            }

        }, authorize)

        /** Pushing from Slave **/
        channel.on(`${name}-pushing`, async ({ user, body }) => {

            try {

                g && log.info(`[M.Push] -> Start / ${Sfy(body).slice(0, 128)} [...]`)
                return await _onSave(body.items, user)

            } catch (error) {

                log.warn(`[M.Push] -> Fail / ${Sfy(error.message)} [...]`)
                return 'fail'

            }

        }, authorize)

    }

    /** Select from DB **/
    onPull = async ({ id, dst, updatedAt }, auth?: tUser) => {

        try {

            const dest = ['all', dst]

            if (auth) {
                auth.proj && dest.push(auth.proj)
                auth.type && dest.push(auth.type)
                // Duplicated with var:"dst" auth.name && dest.push(auth.name)
                auth.proj && auth.type && dest.push(`${auth.proj}_${auth.type}`)
            }

            /** N-Items from Master to Slave **/
            const items = await this.table.findAll({
                limit: this.limit,
                where: {
                    dst: { [Op.or]: dest },
                    [Op.or]: [
                        { updatedAt: { [Op.gt]: updatedAt } },
                        { id: { [Op.gt]: id }, updatedAt: { [Op.eq]: updatedAt } }]
                },
                order: [['updatedAt', 'ASC'], ['id', 'ASC']],
                raw: true,
            })

            /** Last-Item of Slave **/
            const latest = await this.table.findOne({
                where: { src: dst },
                order: [['updatedAt', 'DESC'], ['id', 'DESC']],
                raw: true
            })

            return { items: items ?? [], checkpoint: latest ?? {} }

        } catch (error: any) {

            return { items: [], checkpoint: {} }

        }

    }

    /** Injecting Auth-Values into item **/
    onBeforeSave = (item: any, auth: tUser) => item

    /** Insert to DB **/
    onSave = async (items, auth?: tUser) => {

        items.map(async (e) => {

            if (auth) return await this.table.upsert(this.onBeforeSave(e, auth))
            else return await this.table.upsert(e)

        })
        return 'Done'

    }

    /** Notify to Slave **/
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

}