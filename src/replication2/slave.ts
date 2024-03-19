import { Now, Loop, AsyncWait, Safe, log } from 'utils'
import { zip, unzip } from './common'
import { Connection } from '../connection'
import { Op } from '../util'

type tDirection = 'bidirectional' | 'pull-only' | 'push-only'

interface iRS {

    api: Connection
    sequel: any
    models: string[]
    slave_name: string
    direction?: tDirection
    log?: boolean
    size?: number
    msgpackr?: boolean

}

export class ReplicaSlave {

    _: iRS

    constructor(args: iRS) {

        log.warn(`[ReplicaSlave] Initializing`)
        this._ = { size: 5, ...args }
        this.replicate()

    }

    pull = /** PULL METHOD */ {

        /** from Local */
        get_last: async ({ model, slave_name }, { }) => {

            const { id, updatedAt } = await model.findOne({
                where: { src: { [Op.not]: slave_name } },
                order: [['updatedAt', 'DESC'], ['id', 'DESC']],
                raw: true
            })

            return {
                id: id ?? null,
                updatedAt: updatedAt ?? null,
            }

        },

        /** from Cloud -> Save */
        get_items: ({ key }, { pull_last }) => new Promise((res, rej) => {

            this._.api.cio.timeout(10 * 1000).emit('get_items', key, zip(pull_last), (err, response) => {

                try {

                    if (err) rej(err.message)
                    else res(unzip(response))

                } catch (err) { rej(err.message) }

            })

        }),

        /** to Local */
        save_items: async ({ model }, { pull_items }) => {

            for (const x of pull_items) await model.upsert(x)
            return 'Done'

        },

    }

    push = /** PUSH METHOD */ {

        /** from Cloud */
        get_last: ({ key, table_name, slave_name }, { }) => new Promise((res, rej) => {

            this._.api.cio.timeout(10 * 1000).emit('get_last', key, zip({ table_name, slave_name }), (err, response) => {

                try {

                    if (err) rej(err.message)
                    else res(unzip(response))

                } catch (err) { rej(err.message) }

            })

        }),

        /** from Local -> Send */
        get_items: async ({ model, master_name, slave_name }, { push_last }) => {

            const { id, updatedAt } = push_last

            return model.findAll({
                where: {
                    src: slave_name,
                    dst: master_name,
                    [Op.or]: [{ updatedAt: { [Op.gt]: updatedAt } }, { id: { [Op.gt]: id }, updatedAt: { [Op.eq]: updatedAt } }]
                },
                limit: this._.size,
                order: [['updatedAt', 'ASC'], ['id', 'ASC']],
                raw: true,
            })

        },

        /** to Cloud */
        send_items: ({ key }, { push_items }) => new Promise((res, rej) => {

            this._.api.cio.timeout(10 * 1000).emit('send_items', key, zip(push_items), (err, response) => {

                try {

                    if (err) rej(err.message)
                    else res(unzip(response))

                } catch (err) { rej(err.message) }

            })

        }),

    }

    replicate = () => {

        let free = true
        let length = this._.models.length
        let index = 0
        let logs: any = []
        let skip = []

        this._.api.on(this._.slave_name, ([table_name]) => { /** skip[index] = 0 **/ })

        Loop(() => free && Safe(async () => {

            const key = Now()
            free = false

            try {

                if (typeof skip[index] === 'number' && skip[index] > 0) { --skip[index] } else {

                    /** INITIATE **/

                    logs.push(`[R] Starting with index [${index}]`)
                    const table_name = this._.models[index]

                    logs.push(`[R] Found name of model [${table_name}]`)
                    const model = this._.sequel.models[table_name]

                    const tmp: any = { start: Date.now() }
                    const arg: any = { key, index, model, table_name, master_name: 'master', slave_name: this._.slave_name }

                    /** METHOD: PULL **/ if (this._.direction === 'bidirectional' || this._.direction === 'pull-only') {

                        logs.push(`[R] Get_last from Local [...]`)
                        tmp.pull_last = await this.pull.get_last(arg, tmp)

                        logs.push(`[R] Get_items from Cloud [...]`)
                        tmp.pull_items = await this.pull.get_items(arg, tmp)

                        logs.push(`[R] Save_items to Local [...]`)
                        tmp.pull_saved = await this.pull.save_items(arg, tmp)

                    }

                    /** METHOD: PUSH **/ if (this._.direction === 'bidirectional' || this._.direction === 'push-only') {

                        logs.push(`[R] Get_last from Cloud [...]`)
                        tmp.push_last = await this.push.get_last(arg, tmp)

                        logs.push(`[R] Get_items from Local[...]`)
                        tmp.push_items = await this.push.get_items(arg, tmp)

                        logs.push(`[R] Send_items to Cloud [...]`)
                        tmp.push_sent = await this.push.send_items(arg, tmp)

                    }

                    /** When there are items to be pushed or pulled */
                    logs.push(`[R] Sleep for ${14 / 2}s duel to [...]`)
                    skip[index] = 14

                }

            } catch (err) {

                skip[index] = 5
                logs.push(`[R] Sleep for ${5 / 2}s due to ${err.message}`)

            } finally {

                if (logs.length) {
                    console.log(`\n[R] ${key}`)
                    for (const x of logs) console.log(x)
                    logs = []
                }

                await AsyncWait(500)
                index = (index + 1) >= length ? 0 : (index + 1)
                free = true

            }

        }), 10)

    }

}