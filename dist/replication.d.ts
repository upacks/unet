export declare class ReplicaMaster {
    name: any;
    table: any;
    limit: any;
    onChangeCall: (...n: any[]) => boolean;
    constructor({ me, name, table, debug, channel, limit, onPull, onSave, onTrigger, onChange }: {
        me: any;
        name: any;
        table: any;
        debug: any;
        channel: any;
        limit: any;
        onPull: any;
        onSave: any;
        onTrigger: any;
        onChange: any;
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
    onChangeCall: (...n: any[]) => boolean;
    constructor({ me, name, table, channel, debug, retain, limit, onPull, onPush, onTrigger, onSave, onChange }: {
        me: any;
        name: any;
        table: any;
        channel: any;
        debug: any;
        retain: any;
        limit: any;
        onPull: any;
        onPush: any;
        onTrigger: any;
        onSave: any;
        onChange: any;
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