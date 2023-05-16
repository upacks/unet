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

export class Core {

    config = {
        port0: 8080,
        port: 8443,
        redisChannel: 'expose',
        keepAliveTimeout: (90 * 1000) + (1000 * 2),
        headersTimeout: (90 * 1000) + (1000 * 4),
    }
    store = {}
    redis

    constructor(conf) {

        this.config = conf
        this.redis = Redis({})
        this.start()

    }

    start = () => {

        log.info(`Starting a new HTTP.Proxy ...`)

        // ==================== PROXY-SERVER ==================== //

        const app = express()
        const ppp = express()

        const kapp = http.createServer(app)

        app.get('/', (req, res) => res.status(500).send(`Sorry:(`))
        ppp.listen(this.config.port0)

        const server = kapp.listen(this.config.port)
        const apiProxy = httpProxy.createProxyServer()

        const getPath = (url) => { try { return (this.store[url.split('/')[1]]).http } catch (error) { return `http://localhost:${this.config.port0}` } }

        // ==================== PROXY-HANDLERS ==================== //

        app.all("*", (req, res) => apiProxy.web(req, res, { target: getPath(req.originalUrl) }))
        server.on('upgrade', (req, socket, head) => apiProxy.ws(req, socket, head, { target: getPath(req.url) }))
        apiProxy.on('error', (err, req, res) => {

            log.error(`While Proxying: ${err.message}`)
            try { res.writeHead(503, { 'Content-Type': 'text/plain' }) } catch (err) { }
            res.end(`Under maintenance!`)

        })

        server.keepAliveTimeout = this.config.keepAliveTimeout
        server.headersTimeout = this.config.headersTimeout

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