/** TCP-Samples **/

import { Shell, Safe, Delay, Loop, log } from 'utils'

import { NetClient, NetServer } from './tcp'
import { Host } from './host'
import { Proxy, Core } from './proxy'

const REPRODUCE_LOOP_ISSUE = () => {

    log.info(`BN_RTCM server is running on ${process.pid} 🚀🚀🚀 \n`)

    const API = new Host({ name: 'bn' })

    const _ = {
        from: { host: "10.10.1.65", port: 8080 },
        to: { host: "143.198.198.77", port: 2202 },
        source: {
            lastMessage: 0,
            reconnect: 0,
        },
        dest: {
            lastMessage: 0,
            reconnect: 0,
        }
    }

    API.on('me', () => _)

    const source = new NetClient(_.from, (client) => {

        ++_.source.reconnect

        client.on('data', (chunk: any) => Safe(() => {
            source.last = _.source.lastMessage = Date.now()
            dest.client.write(chunk)
        }))

    })

    source.onRestart = () => { }

    source.onInfo = (t, { type, message }) => {
        log[type](`[${t}] -> ${message}`)
    }

    const dest = new NetClient(_.to, (client) => {

        ++_.dest.reconnect

        client.on('data', (chunk: any) => {
            dest.last = _.dest.lastMessage = Date.now()
        })

    })

    dest.onInfo = (t, { type, message }) => {
        log[type](`[${t}] -> ${message}`)
    }

    Loop(() => { dest.last = Date.now() }, 1000)
}

REPRODUCE_LOOP_ISSUE()

const HOST_SAMPLE = () => {

    const API = new Host({ name: 'none' })

}

const PROXY_SAMPLE = () => {

    log.success(`PROXY_SAMPLE STARTED`)

    const Gate = new Core({})

    Loop(() => { }, 250)

}

const TCP_SAMPLE = () => {

    log.success(`TCP_SAMPLE STARTED`)

    Loop(() => {

        const pid = process.pid
        const ls = Shell.exec(`netstat -ano | grep ${2101}`, { silent: true }).stdout
        const nt = Shell.exec(`netstat -lp --inet | grep "${pid}/node"`, { silent: true }).stdout
        const pf = Shell.exec(`ps -p ${pid} -o %cpu,%mem,cmd`, { silent: true }).stdout

        console.log(ls)
        console.log(nt)
        console.log(pf)

    }, 5000)

    Delay(() => {

        new NetServer({ port: 2101 }, (client) => {

            client.on('data', (data: any) => {
                const user = client.authenticate(data)
            })

        })

    }, 250)


    Delay(() => {

        new NetClient({ port: 2101 }, (client) => {

            client.authenticate('my-token-:)')

            client.on('data', (data: any) => {
                log.info(data)
            })

        })

    }, 500)

}