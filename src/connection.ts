import http from 'http'
import https from 'https'
import axios from "axios"
import { Delay, log, env } from 'utils'

const { io } = require("socket.io-client")

const whoami = env.whoami ?? "Master"
const proxy = env.proxy ?? "http://127.0.0.1:8443"
const token = env.token ?? "-"

// ==================== CLASS: CONNECTION ==================== //

export interface iConnection {
    name: string /** host name **/
    proxy?: string /** proxy server **/
    token?: string /** bearer **/
    timeout?: number /** request timeout **/
}

export class Connection {

    private cio: any
    private caxios: any
    public name: string
    public token: string
    public proxy: string
    public timeout: number

    constructor(conf: iConnection) {

        this.name = conf.name ?? '-'
        this.token = conf.token ?? token
        this.proxy = conf.proxy ?? proxy
        this.timeout = conf.timeout ?? 5000

        log.success(`Creating connection: ${this.proxy}/${this.name}`)

        this.cio = io(this.proxy, {
            transports: ['websocket', 'polling'],
            path: `/${this.name}/socket.io/`,
            query: { host: this.name, whoami },
            auth: { token: `Bearer ${this.token}` },
        })

        this.cio.on("connect", () => {
            log.success(`ws:${this.name}: Connection made [${this.proxy}/${this.name}]`)
            this.cio.sendBuffer = []
        })

        this.cio.on('disconnect', () => {
            log.warn(`ws:${this.name}: Disconnected [${this.proxy}/${this.name}]`)
            Delay(() => this.cio.connect(), 2500)
        })

        this.cio.on("connect_error", (error) => {
            console.log(error)
            log.error(`ws:${this.name}: ${error.message}`)
        })

        this.caxios = axios.create({
            baseURL: `${this.proxy}/${this.name}/`,
            timeout: this.timeout,
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${this.token}`,
                'whoami': whoami,
            },
            httpAgent: new http.Agent({ keepAlive: true }),
            httpsAgent: new https.Agent({ keepAlive: true }),
        })

    }

    connect = () => this.cio.connect()
    exit = () => this.cio.disconnect()

    /** _____________________________________________________________ HTTP-Client _____________________________________________________________ **/

    res = (response) => {
        try {

            typeof response.data === 'string' && log.success(response.data)
            return response.data

        } catch (err) { return null }
    }

    rej = (error) => {
        try {

            const info = error.response?.data ?? error.message
            log.error(info)
            return error

        } catch (err) { return error }
    }

    get = (channel, data) => new Promise((resolve, reject) => {
        this.caxios.get(channel, { params: data })
            .then(response => resolve(this.res(response)))
            .catch(err => reject(this.rej(err)))
    })

    set = (channel, data) => new Promise((resolve, reject) => {
        this.caxios.post(channel, data)
            .then(response => resolve(this.res(response)))
            .catch(err => reject(this.rej(err)))
    })

    pull = (channel, data, cb) => {
        if (typeof cb === 'undefined') {
            return this.get(channel, data)
        } else {
            return this.get(channel, data)
                .then(response => cb(null, response))
                .catch(err => cb(err, null))
        }
    }

    push = (channel, data, cb) => {
        if (typeof cb === 'undefined') {
            return this.set(channel, data)
        } else {
            return this.set(channel, data)
                .then(response => cb(null, response))
                .catch(err => cb(err, null))
        }
    }

    poll = (channel, data, cb) => {

        const update = () => Delay(() => this.pull(channel, data, cb), 25)
        this.cio.on(channel, (go) => go && update())
        Delay(() => update(), 25)

    }

    /** _____________________________________________________________ WS-Client _____________________________________________________________ **/

    emit = (channel, data, cb) => {
        const call = typeof cb === 'undefined' ? (...n) => true : cb
        this.get(channel, data)
            .then(response => call(null, response))
            .catch(err => call(err, null))
    }

    on = (channel, cb) => {
        this.cio.on(channel, cb)
    }


}
