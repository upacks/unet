import { Host } from '../host';
interface iRM {
    sequel: any;
    api: Host;
    log?: boolean;
    msgpackr?: boolean;
    auth?: boolean;
}
export declare class rMaster {
    _: iRM;
    kv: any;
    cb: any;
    constructor(args: iRM);
    /** Slave request: Checkpoint of slave */
    get_last: (data: any, callback: any) => Promise<void>;
    /** Slave request: Items according to checkpoint */
    get_items: (data: any, callback: any) => Promise<void>;
    /** Slave request: Sending items according to checkpoint */
    send_items: (data: any, callback: any) => Promise<void>;
    on_update: (cb: any) => any;
}
export {};
//# sourceMappingURL=master.d.ts.map