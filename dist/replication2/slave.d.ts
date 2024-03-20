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
    models: tModelConfig[];
}
export declare class rSlave {
    _: iRS;
    cb: any;
    constructor(args: iRS);
    pull: {
        /** from Local */
        get_last: ({ model, slave_name, retain }: {
            model: any;
            slave_name: any;
            retain: any;
        }, {}: {}) => Promise<{
            id: any;
            updatedAt: any;
        }>;
        /** from Cloud */
        get_items: ({ key, table_name, slave_name, size }: {
            key: any;
            table_name: any;
            slave_name: any;
            size: any;
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
        get_last: ({ key, table_name, slave_name }: {
            key: any;
            table_name: any;
            slave_name: any;
        }, {}: {}) => Promise<unknown>;
        /** from Local */
        get_items: ({ model, master_name, slave_name, size }: {
            model: any;
            master_name: any;
            slave_name: any;
            size: any;
        }, { push_last }: {
            push_last: any;
        }) => Promise<any>;
        /** to Cloud (send) */
        send_items: ({ key, table_name, slave_name }: {
            key: any;
            table_name: any;
            slave_name: any;
        }, { push_items }: {
            push_items: any;
        }) => Promise<unknown>;
    };
    replicate: () => void;
    on_update: (cb: any) => any;
}
export {};
//# sourceMappingURL=slave.d.ts.map