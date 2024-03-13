/** TCP-Samples **/

import { Shell, Safe, Delay, Loop, log } from 'utils'

import { NetClient, NetServer } from './tcp'
import { Host } from './host'
import { Connection } from './connection'
import { Proxy, Core } from './proxy'

const HOST_AND_CONNECTION = () => {

    const pro = new Core({ port: 8080 })
    const api = new Host({ name: 'HOST', port: 5050 })

    api.on('/', () => 'hi')

    Loop(() => api.emit('sms', `${Date.now()}`), 2500)

    const monit = () => {

        api.emitBy('sms', 'Boys', (user) => {

            console.log('server', user)
            return user.proj === 'VMP'
        })

    }

    Delay(() => monit(), 8 * 1000)
    Delay(() => monit(), 10 * 1000)

    Delay(() => {

        const io = new Connection({ name: 'HOST', proxy: 'http://localhost:5050', token: 'RB4c' })
        const OM = new Connection({ name: 'HOST', proxy: 'http://localhost:5050', token: 'YXa7MGzOz8tnNoOlNodQHnj__3rLoLFecyYW_fzRB4c' })

        io.on('sms', (data) => console.log('IO', data))
        OM.on('sms', (data) => console.log('OM', data))

        Delay(() => { io.cio.disconnect() }, 15 * 1000)
        Delay(() => { OM.cio.disconnect() }, 18 * 1000)

    }, 2500)

}

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

const HOST_SAMPLE = () => {

    const API = new Host({ name: 'none', port: 5050 })

    API.on('authorize', ({ headers, user }, res) => {

        console.log(headers)
        console.log(user)
        return 'Autorized'

    }, true)

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