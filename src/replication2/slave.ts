import { Loop, AsyncWait, Safe, moment, dateFormat, log } from 'utils'
import { zip, unzip } from './common'
import { Connection } from '../connection'
import { Op } from '../util'

type tDirection = 'bidirectional' | 'pull-only' | 'push-only'

type tModelConfig = {
    name: string
    direction?: tDirection
    size?: number
    retain?: [number | any, string | any] /** [5,'days'] -> Last 5 days of data will be replicated */,
    delay_success?: number
    delay_fail?: number
    delay_loop?: number
    log?: boolean
}

interface iRS {

    api: Connection
    sequel: any
    slave_name: string
    msgpackr?: boolean
    parallel?: boolean
    models: tModelConfig[]

}

export class rSlave {

    _: iRS
    cb = null

    constructor(args: iRS) {

        log.warn(`[R] Replication on Slave [...]`)

        this._ = {
            api: null,
            sequel: null,
            slave_name: '',
            msgpackr: true,
            parallel: false,
            ...args,
        }

        this._.models.map((conf) => {
            conf = {
                direction: 'bidirectional',
                size: 5, /** The size basically equals to a kb(s) **/
                retain: [90, 'days'],
                delay_success: 7500,
                delay_fail: 5000,
                delay_loop: 500,
                log: true,
                ...conf
            }
        })

        if (this._.parallel) this._.models.map((conf) => this.replicate([conf]))
        else this.replicate(this._.models)

    }

    pull = /** PULL METHOD */ {

        /** from Local */
        get_last: async ({ model, slave_name, retain }, { }) => {

            const item = await model.findOne({
                where: { src: { [Op.not]: slave_name } },
                order: [['updatedAt', 'DESC'], ['id', 'DESC']],
                raw: true
            })

            return {
                id: item?.id ?? '',
                updatedAt: item?.updatedAt ?? moment().add(-(retain[0]), retain[1]).format(dateFormat),
            }

        },

        /** from Cloud */
        get_items: ({ key, table_name, slave_name, size }, { pull_last }) => new Promise((res, rej) => {

            this._.api.cio.timeout(10 * 1000)
                .emit('get_items', zip({ key, table_name, slave_name, last: pull_last, size: size }), (err, response) => {

                    try {

                        if (err) rej(err.message)
                        else res(unzip(response))

                    } catch (err) { rej(err.message) }

                })

        }),

        /** to Local (save) */
        save_items: async ({ model, table_name, slave_name }, { pull_items }) => {

            this.cb && this.cb(table_name, slave_name)
            for (const x of pull_items) await model.upsert(x)
            return 'Done'

        },

    }

    push = /** PUSH METHOD */ {

        /** from Cloud */
        get_last: ({ key, table_name, slave_name }, { }) => new Promise((res, rej) => {

            this._.api.cio.timeout(10 * 1000).emit('get_last', zip({ key, table_name, slave_name }), (err, response) => {

                try {

                    if (err) rej(err.message)
                    else res(unzip(response))

                } catch (err) { rej(err.message) }

            })

        }),

        /** from Local */
        get_items: async ({ model, master_name, slave_name, size }, { push_last }) => {

            const { id, updatedAt } = push_last

            return model.findAll({
                where: {
                    src: slave_name,
                    dst: master_name,
                    [Op.or]: [{ updatedAt: { [Op.gt]: updatedAt } }, { id: { [Op.gt]: id }, updatedAt: { [Op.eq]: updatedAt } }]
                },
                limit: size,
                order: [['updatedAt', 'ASC'], ['id', 'ASC']],
                raw: true,
            })

        },

        /** to Cloud (send) */
        send_items: ({ key, table_name, slave_name }, { push_items }) => new Promise((res, rej) => {

            this._.api.cio.timeout(10 * 1000).emit('send_items', zip({ key, table_name, slave_name, items: push_items }), (err, response) => {

                try {

                    if (err) rej(err.message)
                    else res(unzip(response))

                } catch (err) { rej(err.message) }

            })

        }),

    }

    replicate = (ls = []) => {

        let free = true
        let length = ls.length
        let index = 0
        let logs: any = []
        let skip = []

        this._.api.on(this._.slave_name, ([table_name]) => { /** skip[index] = 0 **/ })

        Loop(() => free && Safe(async () => {

            free = false
            const key = Date.now()
            const { name, direction, retain, size, delay_success, delay_fail, delay_loop } = ls[index]

            try {

                if (typeof skip[index] === 'number' && skip[index] > 0) { --skip[index] } else {

                    /** INITIATE **/

                    logs.push(`[R] Start:      Index [${index}]`)
                    logs.push(`[R] Start:      Model [${name}]`)
                    const model = this._.sequel.models[name]

                    const arg: any = { key, index, model, table_name: name, master_name: 'master', slave_name: this._.slave_name, retain, size }
                    const tmp: any = { start: Date.now() }

                    /** METHOD: PULL **/ if (direction === 'bidirectional' || direction === 'pull-only') {

                        logs.push(`[R] Get_last:   From Local [...]`)
                        tmp.pull_last = await this.pull.get_last(arg, tmp)

                        logs.push(`[R] Get_items:  From Cloud [...]`)
                        tmp.pull_items = await this.pull.get_items(arg, tmp)

                        logs.push(`[R] Save_items: To Local [...]`)
                        tmp.pull_saved = await this.pull.save_items(arg, tmp)

                    }

                    /** METHOD: PUSH **/ if (direction === 'bidirectional' || direction === 'push-only') {

                        logs.push(`[R] Get_last:   From Cloud [...]`)
                        tmp.push_last = await this.push.get_last(arg, tmp)

                        logs.push(`[R] Get_items:  From Local[...]`)
                        tmp.push_items = await this.push.get_items(arg, tmp)

                        logs.push(`[R] Send_items: To Cloud [...]`)
                        tmp.push_sent = await this.push.send_items(arg, tmp)

                    }

                    /** When there are items to be pushed or pulled */

                    if (tmp.pull_items?.length === size) {

                        skip[index] = 0
                        logs.push(`[R] Sleep:      Next ${skip[index]} loop(s) / There are items to Pull`)

                    }

                    else if (tmp.push_items?.length === size) {

                        skip[index] = 0
                        logs.push(`[R] Sleep:      Next ${skip[index]} loop(s) / There are items to Push`)

                    }

                    else {

                        skip[index] = Math.ceil(delay_success / delay_loop)
                        logs.push(`[R] Sleep:      Next ${skip[index]} loop(s) / No items to Pull or Push`)

                    }

                }

            } catch (err) {

                skip[index] = Math.ceil(delay_fail / delay_loop)
                logs.push(`[R] Sleep:      Next ${skip[index]} loop(s) / due to ${err.message}`)

            } finally {

                if (logs.length) {
                    console.log(`\n[R] ${key}`)
                    for (const x of logs) console.log(x)
                    logs = []
                }

                await AsyncWait(delay_loop)
                index = (index + 1) >= length ? 0 : (index + 1)
                free = true

            }

        }), 10)

    }

    on_update = (cb) => this.cb = cb

}