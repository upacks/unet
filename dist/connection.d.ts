type tStatus = 'success' | 'error ' | 'warning';
type tCallback = (err: any, data: any) => any;
type tCallbackSocket = (data: any) => any;
export declare class Connection {
    cio: any;
    caxios: any;
    name: string;
    token: string;
    proxy: string;
    timeout: number;
    rejectUnauthorized: boolean;
    constructor(conf: {
        name: string; /** host name **/
        proxy?: string; /** proxy server **/
        token?: string; /** bearer **/
        timeout?: number; /** request timeout **/
        rejectUnauthorized?: boolean; /** Ignore: Local issuer certificate **/
    });
    connect: () => any;
    exit: () => any;
    /** _____________________________________________________________ HTTP-Client _____________________________________________________________ **/
    get: (channel: string, data: any) => Promise<unknown>;
    set: (channel: string, data: any) => Promise<unknown>;
    pull: (channel: string, data: any, cb: tCallback) => Promise<any>;
    push: (channel: string, data: any, cb: tCallback) => Promise<any>;
    /** _____________________________________________________________ HTTP/WS-Client _____________________________________________________________ **/
    poll: (channel: string, data: any, cb: tCallback) => void;
    /** _____________________________________________________________ WS-Client _____________________________________________________________ **/
    emit: (channel: string, data: any, volatile?: boolean) => void;
    on: (channel: string, cb: tCallbackSocket) => void;
    status: (cb: (name: tStatus) => any) => void;
}
export {};
//# sourceMappingURL=connection.d.ts.map