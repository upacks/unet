import Net from 'net'
import { Delay, Loop, log } from 'utils'

export class NetHost {
    constructor() { }
}

export class NetConnection {

    client
    config
    callback
    last = Date.now()

    constructor({ host, port }, cb) {

        this.config = { host, port: Number(port) }
        this.callback = cb
        this.start()

        Loop(() => {
            /** Consider ( as channel broken ) when server doesn't send message for over 30 (+~5) second **/
            if (Date.now() - this.last > (30 * 1000)) {
                this.last = Date.now()
                this.restart()
            }

        }, 5 * 1000)

    }

    log = (s) => log.info(`TCP.Connection ${this.config.host}: ${s}`)

    restart = () => {

        try {
            this.log(`Removing current connections and listeners ...`)
            this.client.removeAllListeners()
            this.client.destroy()
        } catch (err) {
            this.log(`While Removing current connections: ${err.message}`)
        } finally {
            Delay(() => this.start(), 5000)
        }

    }

    start = () => {

        this.log(`Starting a new NET.SOCKET ...`)

        this.client = new Net.Socket()

        this.client.connect(this.config, () => {
            this.log(`Connection established with the server`)
        })

        this.client.on('data', (chunk: any) => {
            try {
                this.last = Date.now()
                this.log(`Data received from the server [${chunk.toString().length}]`)
                this.callback(chunk)
            } catch (err) { }
        })

        this.client.on('error', (err: any) => {
            this.log(`On.Error / ${err.message}`)
            this.restart()
        })

        this.client.on('close', () => {
            this.log(`On.Close triggered!`)
            this.restart()
        })

        this.client.on('end', () => {
            this.log(`On.End triggered!`)
            this.restart()
        })

    }

}
