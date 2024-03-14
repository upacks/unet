import { Host, tUser } from '../host'
import { log, Sfy } from 'utils'
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

    /** Get latest by source */
    last = async () => { }

    pull = async () => { }

    push = async () => { }

    save = async () => { }

}