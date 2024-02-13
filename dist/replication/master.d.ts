import { Host, tUser } from '../host';
export declare class ReplicaMaster {
    name: any;
    table: any;
    limit: any;
    onChangeCall: any;
    constructor({ me, name, table, channel, authorize, debug, limit, onPull, onTrigger, onSave, onChange, onBeforeSave }: {
        me: string /** Device name */;
        name: string /** Table name */;
        table: any /** Sequel Table */;
        channel: Host /** Host endpoint */;
        authorize?: boolean /** Require Bearer & Will try to save @tUser */;
        limit?: number /** Rows in a request */;
        debug?: boolean;
        onPull?: () => {} | any /** Customize: Pull method */;
        onTrigger?: () => {} /** Customize: That listens Sequel events and triggers replication */;
        onSave?: () => {} | any /** Customize: Save method */;
        onChange?: () => {} /** Customize: Change method */;
        onBeforeSave?: (item: any, auth: tUser) => any /** Customize: BeforeSave mathod */;
    });
    /** Select from DB **/
    onPull: ({ id, dst, updatedAt }: {
        id: any;
        dst: any;
        updatedAt: any;
    }, auth?: tUser) => Promise<{
        items: any;
        checkpoint: any;
    }>;
    /** Injecting Auth-Values into item **/
    onBeforeSave: (item: any, auth: tUser) => any;
    /** Insert to DB **/
    onSave: (items: any, auth?: tUser) => Promise<string>;
    /** Notify to Slave **/
    onTrigger: (next: any) => void;
}
//# sourceMappingURL=master.d.ts.map