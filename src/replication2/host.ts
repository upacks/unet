import { Host, tUser } from '../host'
import { log, Sfy } from 'utils'
import { Op } from '../util'

export class ReplicaHost {

    constructor({

        bidirectional = true

    }) { }

    /** Get latest by source */
    last = async () => { }

    pull = async () => { }

    push = async () => { }

    save = async () => { }

}