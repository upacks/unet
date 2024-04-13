import { log } from 'utils'
import { zip, unzip } from './common'
import { Host } from '../host'
import { Op } from '../util'

interface iRM {

    sequel: any
    api: Host
    log?: boolean
    msgpackr?: boolean
    auth?: boolean

}

const demo = false

export class rMaster {

    _: iRM
    kv: any = {}
    cb = null

    constructor(args: iRM) {

        log.warn(`[M] Replication on Master [...]`)

        this._ = {
            ...args
        }

        this._.api.io.on('connection', (socket) => {

            socket.on('get_last', this.get_last)
            socket.on('get_items', this.get_items)
            socket.on('send_items', this.send_items)

        })

    }

    /** Slave request: Checkpoint of slave */
    get_last = async (data, callback) => {

        let start = Date.now()

        try {

            let { key, table_name, slave_name } = unzip(data)
            if (demo) table_name = 'rep_master' /** Must be remove before production */

            const model = this._.sequel.models[table_name]

            const item = await model.findOne({
                where: this.kv.hasOwnProperty(slave_name) ? { src: slave_name, updatedAt: { [Op.gte]: this.kv[slave_name].updatedAt } } : { src: slave_name },
                order: [['updatedAt', 'DESC'], ['id', 'DESC']],
                raw: true
            })

            const last = {
                id: item?.id ?? '',
                updatedAt: item?.updatedAt ?? '',
            }

            if (item?.id && item?.updatedAt) this.kv[slave_name] = last

            console.log(`[M] Get_last:   FROM ${slave_name} TO ${table_name} (${Date.now() - start}ms`)
            callback(zip({ status: true, data: last }))

        } catch (err) {

            console.error(`[M] Get_last:   ${err.message}  (${Date.now() - start}ms`)
            callback(zip({ status: false, message: err.message }))

        }

    }

    /** Slave request: Items according to checkpoint */
    get_items = async (data, callback) => {

        let start = Date.now()

        try {

            let { key, table_name, slave_name, last: { id, updatedAt }, size } = unzip(data)

            if (demo) table_name = 'rep_master' /** Must be remove before production */
            const model = this._.sequel.models[table_name]

            // N-Items from Master to Slave
            const items = await model.findAll({
                where: {
                    dst: { [Op.or]: ['all', slave_name] },
                    [Op.or]: [
                        { updatedAt: { [Op.gt]: updatedAt } },
                        {
                            id: { [Op.gt]: id },
                            updatedAt: { [Op.eq]: updatedAt },
                        }
                    ]
                },
                order: [['updatedAt', 'ASC'], ['id', 'ASC']],
                limit: size,
                raw: true,
            })

            // Cleaning the payload of deleted items
            for (const x of items) if (x.deletedAt !== null) x.data = null

            console.log(`[M] Get_items:  FROM ${slave_name} TO ${table_name} ITEMS ${items?.length} (${Date.now() - start}ms`)
            callback(zip({ status: true, data: items }))

        } catch (err) {

            console.error(`[M] Get_items:  ${err.message} (${Date.now() - start}ms`)
            callback(zip({ status: false, message: err.message }))

        }

    }

    /** Slave request: Sending items according to checkpoint */
    send_items = async (data, callback) => {

        let start = Date.now()

        try {

            let { key, table_name, slave_name, items } = unzip(data)
            if (demo) table_name = 'rep_master' /** Must be remove before production */

            const model = this._.sequel.models[table_name]

            this.cb && this.cb(table_name, slave_name)

            for (const x of items) await model.upsert(x)

            console.log(`[M] Save_items: FROM ${slave_name} TO ${table_name} ITEMS ${items.length} (${Date.now() - start}ms`)
            callback(zip({ status: true, data: items.length ?? 0 }))

        } catch (err) {

            console.error(`[M] Save_items: ${err.message} (${Date.now() - start}ms`)
            callback(zip({ status: false, message: err.message }))

        }

    }

    on_update = (cb) => this.cb = cb

}