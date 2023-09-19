import { Host } from './host';
import { Connection } from './connection';
export declare class ReplicaMaster {
    name: any;
    table: any;
    limit: any;
    onChangeCall: any;
    constructor({ me, name, table, channel, debug, limit, onPull, onTrigger, onSave, onChange }: {
        me: string /** Device name */;
        name: string /** Table name */;
        table: any /** Sequel Table */;
        channel: Host /** Host endpoint */;
        debug?: boolean;
        limit?: number /** Rows in a request */;
        onPull?: () => {} | any /** Customize: Pull method */;
        onTrigger?: () => {} /** Customize: That listens Sequel events and triggers replication */;
        onSave?: () => {} | any /** Customize: Save method */;
        onChange?: () => {} /** Customize: Change method */;
    });
    onPull: ({ id, dst, updatedAt }: {
        id: any;
        dst: any;
        updatedAt: any;
    }) => Promise<{
        items: any;
        checkpoint: any;
    }>;
    onTrigger: (next: any) => void;
    onSave: (items: any) => Promise<string>;
}
export declare class ReplicaSlave {
    lastPull: number;
    isBusy: boolean;
    hopes: any[];
    success: number;
    table: any;
    name: any;
    limit: number;
    delay: number;
    onChangeCall: any;
    constructor({ me, name, table, channel, debug, retain, limit, onPull, onPush, onTrigger, onSave, onChange }: {
        me: string /** Device name */;
        name: string /** Table name */;
        table: any /** Sequel Table */;
        channel: Connection /** Host endpoint */;
        retain: [number | any, string | any] /** [5,'days'] -> Last 5 days of data will be replicated */;
        debug?: boolean;
        limit?: number /** Rows in a request */;
        onPull?: () => {} /** Customize: Pull method */;
        onPush?: () => {} /** Customize: Push method */;
        onTrigger?: () => {} /** Customize: That listens Sequel events and triggers replication */;
        onSave?: () => {} /** Customize: Save method */;
        onChange?: () => {} /** Customize: Change method */;
    });
    onPull: (next: any) => void;
    onPush: ({ id, src, dst, updatedAt }: {
        id: any;
        src: any;
        dst: any;
        updatedAt: any;
    }, next: any) => void;
    onTrigger: (next: any) => void;
    onSave: (rows: any) => void;
}
//# sourceMappingURL=replication.d.ts.map