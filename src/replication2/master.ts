import { unpack, pack } from 'msgpackr'
import { unzlibSync } from 'fflate'
import { log, Sfy } from 'utils'

import { Host, tUser } from '../host'
import { Op } from '../util'

interface iRM {

    api: Host /** Replication channel **/
    log?: boolean
    msgpackr?: boolean

}

export class ReplicaMaster {

    constructor(_: iRM) {

        log.warn(`[ReplicaMaster] Initializing`)

    }

    unzip = (zip) => {

        const bin = unzlibSync(zip)
        const data = unpack(bin)
        return data

    }

    /** Get latest by source */
    last = async () => { }

    pull = async () => { }

    push = async () => { }

    save = async () => { }

}