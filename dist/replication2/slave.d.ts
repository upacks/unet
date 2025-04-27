import { Connection } from '../connection';
type tDirection = 'bidirectional' | 'pull-only' | 'push-only';
type tModelConfig = {
    name: string;
    direction?: tDirection;
    size?: number;
    retain?: [number | any, string | any] /** [5,'days'] -> Last 5 days of data will be replicated */;
    delay_success?: number;
    delay_fail?: number;
    delay_loop?: number;
    log?: boolean;
};
interface iRS {
    api: Connection;
    sequel: any;
    slave_name: string;
    msgpackr?: boolean;
    parallel?: boolean;
    models: tModelConfig[];
    debug?: boolean;
}
export declare class rSlave {
    _: iRS;
    kv: any;
    cb: any;
    constructor(args: iRS);
    pull: {
        /** from Local */
        get_last: ({ model, table_name, slave_name, retain, logs }: {
            model: any;
            table_name: any;
            slave_name: any;
            retain: any;
            logs: any;
        }, {}: {}) => Promise<{
            id: any;
            updatedAt: any;
        }>;
        /** from Cloud */
        get_items: ({ key, table_name, slave_name, size, logs }: {
            key: any;
            table_name: any;
            slave_name: any;
            size: any;
            logs: any;
        }, { pull_last }: {
            pull_last: any;
        }) => Promise<unknown>;
        /** to Local (save) */
        save_items: ({ model, table_name, slave_name }: {
            model: any;
            table_name: any;
            slave_name: any;
        }, { pull_items }: {
            pull_items: any;
        }) => Promise<string>;
    };
    push: {
        /** from Cloud */
        get_last: ({ key, table_name, slave_name, logs }: {
            key: any;
            table_name: any;
            slave_name: any;
            logs: any;
        }, {}: {}) => Promise<unknown>;
        /** from Local */
        get_items: ({ model, table_name, master_name, slave_name, size }: {
            model: any;
            table_name: any;
            master_name: any;
            slave_name: any;
            size: any;
        }, { push_last }: {
            push_last: any;
        }) => Promise<any>;
        /** to Cloud (send) */
        send_items: ({ key, table_name, slave_name, logs }: {
            key: any;
            table_name: any;
            slave_name: any;
            logs: any;
        }, { push_items }: {
            push_items: any;
        }) => Promise<unknown>;
    };
    replicate: (ls?: any[]) => void;
    on_update: (cb: any) => any;
}
export {};
//# sourceMappingURL=slave.d.ts.map