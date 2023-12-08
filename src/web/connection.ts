import axios from "axios"
import { Since, Delay, log } from 'utils/web'

const { io } = require("socket.io-client")

const env: any = {}
const whoami = env.whoami ?? "Browser"
const proxy = env.proxy ?? window.location.origin
const token = env.token ?? "-"

type tStatus = 'success' | 'error ' | 'warning'
type tCallback = (err: any, data: any) => any
type tCallbackSocket = (data: any) => any

// ==================== CLASS: CONNECTION ==================== //

export class Connection {

    public cio: any
    public caxios: any
    public name: string
    public token: string
    public proxy: string
    public timeout: number
    public rejectUnauthorized: boolean

    constructor(conf: {

        name: string /** host name **/
        proxy?: string /** proxy server **/
        token?: string /** bearer **/
        timeout?: number /** request timeout **/
        rejectUnauthorized?: boolean /** Ignore: Local issuer certificate **/

    }) {

        this.name = conf.name ?? '-'
        this.token = conf.token ?? token
        this.proxy = conf.proxy ?? proxy
        this.timeout = conf.timeout ?? 5000
        this.rejectUnauthorized = typeof conf.rejectUnauthorized === 'boolean' ? conf.rejectUnauthorized : true

        log.success(`Creating connection: ${this.proxy}/${this.name}`)

        this.cio = io(this.proxy, {
            transports: ['websocket', 'polling'],
            path: `/${this.name}/socket.io/`,
            query: { host: this.name, whoami },
            auth: { token: `Bearer ${this.token}` },
            rejectUnauthorized: this.rejectUnauthorized,
        })

        this.cio.on("connect", () => {

            typeof this.cio.status === 'function' && this.cio.status('success')
            log.success(`ws:${this.name}: Connection made [${this.proxy}/${this.name}]`)
            this.cio.sendBuffer = []

        })

        this.cio.on('disconnect', () => {

            typeof this.cio.status === 'function' && this.cio.status('error')
            log.warn(`ws:${this.name}: Disconnected [${this.proxy}/${this.name}]`)
            Delay(() => this.cio.connect(), 2500)

        })

        this.cio.on("reconnect", () => {

            typeof this.cio.status === 'function' && this.cio.status('warning')

        })

        this.cio.on("connect_error", (error) => {

            typeof this.cio.status === 'function' && this.cio.status('warning')

            try {
                log.error(`ws:${this.name}: ${error.type} / ${error.description.message}`)
            } catch {
                log.error(`ws:${this.name}: ${error.message}`)
            }

        })

        this.caxios = axios.create({
            baseURL: `${this.proxy}/${this.name}/`,
            timeout: this.timeout,
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${this.token}`,
                'whoami': whoami,
            },
            // httpAgent: new http.Agent({ keepAlive: true }),
            // httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: this.rejectUnauthorized }),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        })

    }

    connect = () => this.cio.connect()
    exit = () => this.cio.disconnect()

    /** _____________________________________________________________ HTTP-Client _____________________________________________________________ **/

    get = (channel: string, data: any) => new Promise((resolve, reject) => {
        this.caxios.get(channel, { params: data })
            .then(({ data }) => resolve(data))
            .catch(reject)
    })

    set = (channel: string, data: any) => new Promise((resolve, reject) => {
        this.caxios.post(channel, data)
            .then(({ data }) => resolve(data))
            .catch(reject)
    })

    pull = (channel: string, data: any, cb: tCallback) => {
        if (typeof cb === 'undefined')
            return this.get(channel, data)
        else
            return this.get(channel, data)
                .then(response => cb(null, response))
                .catch(err => cb(err, null))
    }

    push = (channel: string, data: any, cb: tCallback) => {
        if (typeof cb === 'undefined')
            return this.set(channel, data)
        else
            return this.set(channel, data)
                .then(response => cb(null, response))
                .catch(err => cb(err, null))
    }

    /** _____________________________________________________________ HTTP/WS-Client _____________________________________________________________ **/

    poll = (channel: string, data: any, cb: tCallback) => {

        const since = new Since(1000)
        const update = () => this.pull(channel, data, cb)
        since.call(() => update())
        this.cio.on(channel, (go) => go && since.add())
        update()

    }

    /** _____________________________________________________________ WS-Client _____________________________________________________________ **/

    emit = (channel: string, data: any, volatile = false) => {
        volatile ? this.cio.volatile.emit(channel, data) : this.cio.emit(channel, data)
    }

    on = (channel: string, cb: tCallbackSocket) => {
        this.cio.on(channel, cb)
    }

    status = (cb: (name: tStatus) => any) => {
        this.cio.status = cb
    }

}
