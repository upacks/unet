export interface iConnection {
    name: string; /** host name **/
    proxy?: string; /** proxy server **/
    token?: string; /** bearer **/
    timeout?: number; /** request timeout **/
}
export declare class Connection {
    cio: any;
    caxios: any;
    name: string;
    token: string;
    proxy: string;
    timeout: number;
    constructor(conf: iConnection);
    connect: () => any;
    exit: () => any;
    /** _____________________________________________________________ HTTP-Client _____________________________________________________________ **/
    get: (channel: any, data: any) => Promise<unknown>;
    set: (channel: any, data: any) => Promise<unknown>;
    pull: (channel: any, data: any, cb: any) => Promise<any>;
    push: (channel: any, data: any, cb: any) => Promise<any>;
    /** _____________________________________________________________ HTTP/WS-Client _____________________________________________________________ **/
    poll: (channel: any, data: any, cb: any) => void;
    /** _____________________________________________________________ WS-Client _____________________________________________________________ **/
    emit: (channel: any, data: any, volatile?: boolean) => void;
    on: (channel: any, cb: any) => void;
}
//# sourceMappingURL=connection.d.ts.map