/** TCP-Samples **/

import { NetClient, NetServer } from './tcp'
import { Shell, Delay, Loop, log } from 'utils'

log.success(`${process.pid} ${process.ppid}`)

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