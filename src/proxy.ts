import http from 'http'
import express from 'express'
import httpProxy from 'http-proxy'
import { log } from 'utils'
import { Redis } from './redis'

export {
    express,
    httpProxy,
    Proxy,
}

class Proxy {

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
    auth?: any // Authorization
}

export class Core {

    redis
    store = {}
    config: iCore = {
        port: 8443,
        redisChannel: 'expose',
        keepAliveTimeout: (90 * 1000) + (1000 * 2),
        headersTimeout: (90 * 1000) + (1000 * 4),
        auth: null,
    }

    constructor(conf: iCore = {}) {

        this.config = { ...this.config, ...conf }
        this.redis = Redis({})
        this.start()

    }

    start = () => {

        // ==================== PROXY-SERVER ==================== //

        log.info(`[ START ] -> Proxy-Server`)

        const app = express()
        const _app = http.createServer(app)

        app.get('/', (req, res) => res.status(200).send(`:)`))
        app.get('/favicon.ico', (req, res) => res.status(204).end())
        app.get('/200', (req, res) => res.status(200).send(`:)`))
        app.get('/404', (req, res) => res.status(404).send(`:|`))
        app.get('/500', (req, res) => res.status(500).send(`:(`))

        this.config.auth && app.use(this.config.auth)

        const server = _app.listen(this.config.port)
        const apiProxy = httpProxy.createProxyServer()

        // ==================== PROXY-HANDLERS ==================== //

        log.info(`[ START ] -> Proxy-Handlers`)

        const getPath = (url) => {

            try { return (this.store[url.split('/')[1]]).http }
            catch { return null }

        }

        /** Handling all the requests through Express **/
        app.all("*", (req, res) => {

            const target = getPath(req.originalUrl)
            target ? apiProxy.web(req, res, { target }) : res.status(404).end(':(')

        })

        server.on('upgrade', (req, socket, head) => {

            const target = getPath(req.url)
            target ? apiProxy.ws(req, socket, head, { target }) : socket.end(':(')

        })

        apiProxy.on('error', (err, req, res) => {

            log.error(`While Proxying: ${err.message}`)
            try { res.writeHead(503, { 'Content-Type': 'text/plain' }) } catch (err) { }
            res.end(`Service unavailable!`)

        })

        app.use((err, req, res, next) => err ? log.error(`Proxy: ${err.message}`) && res.status(500).send(`Proxy: ${err.message}`) : next())

        server.keepAliveTimeout = this.config.keepAliveTimeout
        server.headersTimeout = this.config.headersTimeout

        // ==================== REDIS-CLIENT ==================== //

        if (typeof this.redis.Sub === 'object') {

            log.info(`[ START ] -> Proxy-Redis`)

            this.redis.Sub.subscribe(this.config.redisChannel, (err, e: string) => err ?
                log.error(err.message) :
                log.info(`Subscribed channels: ${e}`))

            this.redis.Sub.on("message", (channel, message) => {

                log.success(`${channel}: ${message}`)
                const { name, http, ws } = JSON.parse(message)
                this.store[name] = { http, ws }
                this.redis.Pub.publish("expose_reply", name)

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