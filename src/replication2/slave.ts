import { unpack, pack } from 'msgpackr'
import { zlibSync } from 'fflate'

import { log, Loop, Sfy } from 'utils'
import { Connection } from '../connection'
import { Op } from '../util'

interface iRS {

    api: Connection /** Replication channel **/
    log?: boolean
    msgpackr?: boolean

}

export class ReplicaSlave {

    slaveCheckpoint = ''
    masterCheckpoint = ''

    constructor(_: iRS) {

        log.warn(`[ReplicaSlave] Initializing`)

    }

    zip = (data) => {

        const actualSize = typeof data === 'object' ? Sfy(data).length : data.length
        const bin = pack(data)
        const zip = zlibSync(bin, { level: 9 })

        console.log(`String(size): ${typeof data} ` + actualSize)
        console.log(`Pack(size): ${bin.constructor.name} ` + bin.length)
        console.log(`Zip(size): ${zip.constructor.name} ` + zip.length)
        console.log(`Reduced: ${(100 - ((zip.length * 100) / actualSize)).toFixed(1)}%`)

        return { zip, size: `${zip.length}b` }

    }

    /** Get latest from host **/
    checkpoint = async () => {
        //
    }

    /** Pull N from host according to last(x) **/
    pull = async () => {
        //
    }

    /** Pull N from host according to checkpoint(x) **/
    push = async () => {
        //
    }

    /** Save items been pulled **/
    save = async () => {
        //
    }

    try_run = () => Loop(async () => {

        try {

        } catch (err) { }

    }, 100)


}