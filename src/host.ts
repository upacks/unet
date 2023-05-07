import fs from 'fs'
import path from 'path'
import http from 'http'
import cors from 'cors'
import express from 'express'
import { Now, log, env } from 'utils'
import { Server } from "socket.io"
import FileUpload from 'express-fileupload'

import { Redis } from './redis'
import { execute } from './util'

const whoami = env.whoami ?? "Master"
const ws = env.ws ?? "ws://127.0.0.1"
const local = env.local ?? "http://127.0.0.1"

// ==================== CLASS: HOST ==================== //

export interface iHost {
    name: string /** name alias **/
    port?: number
    static?: string /** if serves static **/
    timeout?: number /** request timeout **/
    redis?: boolean /** use redis **/
}

export class Host {

    private server
    private requests: any = {}
    public io
    public app

    public name: string
    public timeout: number
    public port: number
    public redis: boolean

    constructor(conf: iHost) {

        this.name = conf.name
        this.timeout = conf.timeout ?? 5000
        this.port = conf.port ?? 0
        this.redis = conf.hasOwnProperty('redis') ? conf.redis : true

        log.success(`Creating host: ${local}:${this.port}/${this.name}`)

        const { Pub, Sub }: any = this.redis ? Redis({ name: this.name }) : { Pub: {}, Sub: {} }

        this.app = express()
        this.app.use(cors({ origin: '*' }))
        this.app.use(express.json({ limit: '25mb' }))
        this.server = http.createServer(this.app)
        this.server.setTimeout(this.timeout)

        this.app.get(`/${this.name}/health`, (req, res) => res.status(200).send(`${this.name}-${Now()}`))

        this.io = new Server(this.server, {
            transports: ['websocket', 'polling'],
            path: `/${this.name}/socket.io/`,
        })

        this.io.on('connection', (socket) => {
            log.success(`A client connected ${socket.id}`)
            socket.on('disconnect', () => log.warn(`A client disconnected ${socket.id}`))
        })

        if (conf.static) {

            this.app.use(`/${this.name}`, express.static(path.join(__dirname, '..', '..', 'expose', conf.static)))

            this.app.use(FileUpload({ createParentPath: true }))

            this.app.post(`/${this.name}/upload`, async (req, res) => {
                try {
                    if (!req.files) {
                        res.status(400).send({ status: false, message: 'No file uploaded' })
                    } else {
                        const file = req.files.file
                        file.mv(path.join(__dirname, '..', '..', 'expose', conf.static, 'file/') + file.name)
                        res.send({ status: true, message: 'Uploaded', data: { name: file.name, mimetype: file.mimetype, size: file.size } })
                    }
                } catch (err) {
                    res.status(500).send(err)
                }
            })

            this.app.use(`/${this.name}`, (req, res) => {

                fs.readFile(path.join(__dirname, '..', '..', 'expose', conf.static, 'provider.html'), (err, content) => {
                    if (err) {
                        res.status(500).send(err.message)
                    } else {
                        const cb = this.requests[req.path] ?? this.requests['*'] ?? null
                        cb ? execute(cb, req, res, content.toString())
                            .then(e => res.send(e))
                            .catch(e => res.status(500).send(`console.log(${e.message})`)) :
                            res.status(404).send('console.log("Not found")')
                    }
                })

            })

        } else {

            this.app.use(`/${this.name}`, (req, res) => {

                const cb = this.requests[req.path] ?? this.requests['*'] ?? null

                if (cb) {

                    execute(cb, req, res, '').then(e => {

                        res.send(e)

                    }).catch(e => {

                        res.status(500).send(e.message)

                    })

                } else {
                    res.status(404).send('Not found!')
                }

            })

        }

        this.app.use((err, req, res, next) => {
            log.error(err.message)
            res.status(500).send(err.message)
        })

        const server = this.server.listen(this.port, '0.0.0.0', () => {
            this.redis && Pub.publish("expose", JSON.stringify({ name: this.name, http: `${local}:${server.address().port}`, ws: `${ws}:${server.address().port}`, whoami }))
            log.success(`Created host: ${local}:${server.address().port}/${this.name}`)
        })

        server.keepAliveTimeout = (90 * 1000) + (1000 * 6)
        server.headersTimeout = (90 * 1000) + (1000 * 8)

    }

    emit = (channel: string, data: any) => {
        this.io.sockets.emit(channel, data)
    }

    on = (channel: string, callback: any) => {
        const y = (channel ?? '/')[0] === '/' || channel === '*'
        this.requests[y ? channel : `/${channel}`] = callback
    }

    exit = () => {
        this.io.disconnectSockets()
    }

}