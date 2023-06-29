import express from 'express'
import http from 'http'
import httpProxy from 'http-proxy'
import { log } from 'utils'

import { Redis } from './redis'

export class Proxy {

    apiProxy

    constructor() {

        this.apiProxy = httpProxy.createProxyServer()

    }

    http = (req, res, url) => this.apiProxy.web(req, res, { target: url })
    ws = (req, socket, head, url) => this.apiProxy.ws(req, socket, head, { target: url })

}

interface iCore {
    port?: number // 8443
    redisChannel?: string //  'expose'
    keepAliveTimeout?: number // (90 * 1000) + (1000 * 2)
    headersTimeout?: number // (90 * 1000) + (1000 * 4)
}

export class Core {

    config: iCore = {
        port: 8443,
        redisChannel: 'expose',
        keepAliveTimeout: (90 * 1000) + (1000 * 2),
        headersTimeout: (90 * 1000) + (1000 * 4),
    }
    store = {}
    redis

    constructor(conf: iCore = {}) {

        this.config = { ...this.config, ...conf }
        this.redis = Redis({})
        this.start()

    }

    start = () => {

        // ==================== PROXY-SERVER ==================== //

        const app = express()
        const _app = http.createServer(app)

        app.get('/', (req, res) => res.status(200).send(`:)`))
        app.get('/200', (req, res) => res.status(200).send(`:)`))
        app.get('/404', (req, res) => res.status(404).send(`:|`))
        app.get('/500', (req, res) => res.status(500).send(`:(`))

        const server = _app.listen(this.config.port)
        const apiProxy = httpProxy.createProxyServer()

        const getPath = (url) => { try { return (this.store[url.split('/')[1]]).http } catch (error) { return `http://localhost:${this.config.port}/404` } }

        log.info(`Proxy-Server [ STARTED ]`)

        // ==================== PROXY-HANDLERS ==================== //

        app.all("*", (req, res) => apiProxy.web(req, res, { target: getPath(req.originalUrl) }))
        server.on('upgrade', (req, socket, head) => apiProxy.ws(req, socket, head, { target: getPath(req.url) }))
        apiProxy.on('error', (err, req, res) => {

            log.error(`While Proxying: ${err.message}`)
            try { res.writeHead(503, { 'Content-Type': 'text/plain' }) } catch (err) { }
            res.end(`Service unavailable!`)

        })

        server.keepAliveTimeout = this.config.keepAliveTimeout
        server.headersTimeout = this.config.headersTimeout

        log.info(`Proxy-Handlers [ STARTED ]`)

        // ==================== REDIS-CLIENT ==================== //

        if (typeof this.redis.Sub === 'object') {

            this.redis.Sub.subscribe(this.config.redisChannel, (err, e: string) => err ?
                log.error(err.message) :
                log.info(`Subscribed channels: ${e}`))

            this.redis.Sub.on("message", (channel, message) => {
                log.success(`${channel}: ${message}`)
                const { name, http, ws } = JSON.parse(message)
                this.store[name] = { http, ws }
            })

            log.info(`Proxy-Redis [ STARTED ]`)

        }

    }

    stop = () => {

        try {
            log.info(`Removing current connections and listeners ...`)
        } catch (err) {
            log.warn(`While Removing current connections: ${err.message}`)
        }

    }

}