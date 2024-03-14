import { Connection } from '../connection'
import { log, Loop, Sfy } from 'utils'
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