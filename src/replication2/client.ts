import { Connection } from '../connection'
import { log, Loop, Sfy } from 'utils'
import { Op } from '../util'

export class ReplicaHost {

    cf = {
        step: 0,
        interval: 2500,
    }

    constructor({
        bidirectional = true,
        interval = 2500
    }) { }

    log = (x) => log.info(x)

    /** Get latest from host **/
    last = async () => { }

    /** Pull N from host according to last(x) **/
    pull = async () => { }

    /** Pull N from host according to last(x) **/
    push = async () => { }

    save = async () => { }

    try_run = () => Loop(async () => {

        try {

        } catch (err) { }

    }, this.cf.interval)


}