import { log, Sfy } from 'utils'
import { zip, unzip } from './common'
import { Host, tUser } from '../host'
import { Sequelize, Op } from '../util'

interface iRM {

    sequel: any
    api: Host
    log?: boolean
    msgpackr?: boolean
    auth?: boolean

}

interface iPull {

    table_name: string
    slave_name: string
    last: {
        id: string
        updatedAt: string
    }
    items: any
    size: number

}

interface iPush {

    table_name: string
    items: any

}

export class ReplicaMaster {

    cfg: iRM

    constructor(_: iRM) {

        log.warn(`[R] Replication on Master [...]`)

        this.cfg = { ..._ }

        _.api.io.on('connection', (socket) => {

            socket.io('get_items', this.get_items)
            socket.io('get_last', this.get_last)
            socket.io('send_items', this.send_items)

        })

    }

    /** Slave request: Items according to checkpoint */
    get_items = async (key, data, callback) => { }

    /** Slave request: Checkpoint of slave */
    get_last = async (key, data, callback) => { }

    /** Slave request: Sending items according to checkpoint */
    send_items = async (key, data, callback) => { }

    /* lastest_of_slave = async ({ table_name, slave_name }: iPull) => {

        const log = (t, e) => this.cfg.log ? log[t](`[R] lastest_of_slave( ${table_name} ${slave_name} ) | ${e}`) : true

        try {

            const model = this.cfg.sequel.models[table_name]
            const { id, updatedAt } = await model.findOne({
                where: { src: slave_name },
                order: [['updatedAt', 'DESC'], ['id', 'DESC']],
                raw: true
            })

            return { id, updatedAt }

        } catch (err) {

            log('error', err.message)
            return null

        }

    }

    items_for_slave = async ({ table_name, slave_name, last, size }: iPull) => {

        const log = (t, e) => this.cfg.log ? log[t](`[R] items_for_slave( ${table_name} ${slave_name} ) | ${e}`) : true

        try {

            const model = this.cfg.sequel.models[table_name]

            // N-Items from Master to Slave
            const items = await model.findAll({
                limit: size,
                where: {
                    dst: { [Op.or]: slave_name },
                    [Op.or]: [
                        { updatedAt: { [Op.gt]: last.updatedAt } },
                        { id: { [Op.gt]: last.id }, updatedAt: { [Op.eq]: last.updatedAt } }]
                },
                order: [['updatedAt', 'ASC'], ['id', 'ASC']],
                raw: true,
            })

            // Cleaning the payload of deleted items
            for (const x of items) if (x.deletedAt !== null) x.data = null

            return items

        } catch (err) {

            log('error', err.message)
            return null

        }

    }

    items_from_slave = async ({ table_name, items }: iPush) => {

        const log = (t, e) => this.cfg.log ? log[t](`[R] items_from_slave( ${table_name} ${items.length} ) | ${e}`) : true

        try {

            const model = this.cfg.sequel.models[table_name]
            for (const x of items) await model.upsert(x)
            return 'Done'

        } catch (err) {

            log('error', err.message)
            return null

        }

    }

    onPull = async (data, callback) => {

        const log = (t, e) => this.cfg.log ? log[t](`[R] Pull( ${data} ) | ${e}`) : true

        try {

            const parsed: iPull = unzip(data)
            const _last = this.lastest_of_slave(parsed)
            const _items = this.items_for_slave(parsed)
            const result = zip({ last: _last, items: _items })

            callback(result)

        } catch (err) {

            log('error', err.message)
            callback(err.message)

        }

    }

    onPush = async (data, callback) => {

        const log = (t, e) => this.cfg.log ? log[t](`[R] Push( ${data} ) | ${e}`) : true

        try {

            const parsed: iPush = unzip(data)
            const saved = this.items_from_slave(parsed)
            callback(saved)

        } catch (err) {

            log('error', err.message)
            callback(err.message)

        }

    } */

}